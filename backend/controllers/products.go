package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"shop_pos_backend/cache"
	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const productsCachePrefix = "products_page_"

func CreateProduct(c *gin.Context) {
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if result := config.DB.Create(&product); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	cache.Default.DeletePrefix(productsCachePrefix)
	c.JSON(http.StatusOK, product)
}

func GetProducts(c *gin.Context) {
	page := parsePageParam(c.Query("page"), 1)
	pageSize := parsePageParam(c.Query("page_size"), 20)
	if pageSize > 100 {
		pageSize = 100
	}

	search := strings.TrimSpace(c.Query("search"))
	categoryID := parsePageParam(c.Query("category_id"), 0)

	filtersSig := fmt.Sprintf("s_%s_c_%d", search, categoryID)
	cacheKey := fmt.Sprintf("%s%d_size_%d_%s", productsCachePrefix, page, pageSize, filtersSig)
	if cached, ok := cache.Default.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	baseQuery := func(db *gorm.DB) *gorm.DB {
		q := db.Model(&models.Product{}).Where("is_deleted = ?", false)
		if search != "" {
			q = q.Where("name ILIKE ? OR barcode ILIKE ?", "%"+search+"%", "%"+search+"%")
		}
		if categoryID > 0 {
			q = q.Where("category_id = ?", categoryID)
		}
		return q
	}

	var total int64
	baseQuery(config.DB).Count(&total)

	var products []models.Product
	if result := baseQuery(config.DB).Preload("Category").Limit(pageSize).Offset((page - 1) * pageSize).Find(&products); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve products"})
		return
	}

	totalPages := 0
	if pageSize > 0 {
		totalPages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}

	response := gin.H{
		"items":       products,
		"page":        page,
		"page_size":   pageSize,
		"total":       total,
		"total_pages": totalPages,
	}

	cache.Default.Set(cacheKey, response, 2*time.Minute)
	c.JSON(http.StatusOK, response)
}

func GetProductByBarcode(c *gin.Context) {
	barcode := strings.TrimSpace(c.Param("barcode"))
	var product models.Product
	if result := config.DB.Preload("Category").Where("is_deleted = ? AND barcode = ?", false, barcode).First(&product); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	c.JSON(http.StatusOK, product)
}

func parsePageParam(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if result := config.DB.Where("is_deleted = ?", false).First(&product, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Save(&product)
	cache.Default.DeletePrefix(productsCachePrefix)
	c.JSON(http.StatusOK, product)
}

func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if result := config.DB.Model(&models.Product{}).Where("id = ?", id).Update("is_deleted", true); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	cache.Default.DeletePrefix(productsCachePrefix)
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// Additional helper for updating just stock
func UpdateStock(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Quantity int `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var product models.Product
	if result := config.DB.Where("is_deleted = ?", false).First(&product, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	product.StockQuantity = input.Quantity
	config.DB.Save(&product)
	cache.Default.DeletePrefix(productsCachePrefix)
	c.JSON(http.StatusOK, product)
}
