package controllers

import (
	"fmt"
	"net/http"
	"time"

	"shop_pos_backend/cache"
	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	salesCachePrefix  = "sales_page_"
	saleDetailsAPIKey = "sale_id_"
)

type SaleInput struct {
	TotalAmount float64 `json:"total_amount" binding:"required"`
	Items       []struct {
		ProductID uint    `json:"product_id" binding:"required"`
		Quantity  int     `json:"quantity" binding:"required"`
		Price     float64 `json:"price" binding:"required"`
	} `json:"items" binding:"required"`
}

func CreateSale(c *gin.Context) {
	var input SaleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := uint(userID.(float64))

	sale := models.Sale{
		TotalAmount: input.TotalAmount,
		UserID:      uid,
	}

	// Start a transaction
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Create Sale header record
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		for _, item := range input.Items {
			// Update product stock
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				return err
			}

			product.StockQuantity -= item.Quantity
			if product.StockQuantity < 0 {
				product.StockQuantity = 0
			}

			if err := tx.Save(&product).Error; err != nil {
				return err
			}

			// Create SaleItem details record
			saleItem := models.SaleItem{
				SaleID:    sale.ID,
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Price:     item.Price,
			}

			if err := tx.Create(&saleItem).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sale: " + err.Error()})
		return
	}

	// Reload the created sale with user, items, and products
	var loadedSale models.Sale
	if err := config.DB.Preload("User").Preload("Items").Preload("Items.Product").First(&loadedSale, sale.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload created sale"})
		return
	}

	cache.Default.DeletePrefix(salesCachePrefix)
	cache.Default.DeletePrefix(saleDetailsAPIKey)
	cache.Default.Delete("dashboard_stats")
	c.JSON(http.StatusOK, loadedSale)
}

func GetSales(c *gin.Context) {
	page := parsePageParam(c.Query("page"), 1)
	pageSize := parsePageParam(c.Query("page_size"), 20)
	if pageSize > 100 {
		pageSize = 100
	}

	cacheKey := fmt.Sprintf("%s%d_size_%d", salesCachePrefix, page, pageSize)
	if cached, ok := cache.Default.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	var total int64
	config.DB.Model(&models.Sale{}).Count(&total)

	var sales []models.Sale
	// Fetch physical sales records preloading user details and all item lines
	result := config.DB.Preload("User").Preload("Items").Preload("Items.Product").Order("id DESC").Limit(pageSize).Offset((page - 1) * pageSize).Find(&sales)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve sales history"})
		return
	}

	response := gin.H{
		"items":     sales,
		"page":      page,
		"page_size": pageSize,
		"total":     total,
	}

	cache.Default.Set(cacheKey, response, 30*time.Second)
	c.JSON(http.StatusOK, response)
}

func GetSaleByID(c *gin.Context) {
	id := c.Param("id")
	cacheKey := saleDetailsAPIKey + id
	if cached, ok := cache.Default.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	var sale models.Sale
	if result := config.DB.Preload("User").Preload("Items").Preload("Items.Product").First(&sale, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale record not found"})
		return
	}

	cache.Default.Set(cacheKey, sale, 30*time.Second)
	c.JSON(http.StatusOK, sale)
}
