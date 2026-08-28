package controllers

import (
	"fmt"
	"net/http"
	"strings"
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
	CustomerID  *uint   `json:"customer_id"`
	Items       []struct {
		ProductID uint    `json:"product_id" binding:"required"`
		Quantity  int     `json:"quantity" binding:"required"`
		Price     float64 `json:"price" binding:"required"`
	} `json:"items" binding:"required"`
}

// loyaltyPointsPerKyat defines how many points are earned per Kyat spent.
const loyaltyPointsPerKyat = 1.0 / 1000.0

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
		CustomerID:  input.CustomerID,
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
			if err := tx.Where("is_deleted = ?", false).First(&product, item.ProductID).Error; err != nil {
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

		// Award loyalty points to the attached customer
		if sale.CustomerID != nil && *sale.CustomerID > 0 {
			var customer models.Customer
			if err := tx.Where("is_deleted = ?", false).First(&customer, *sale.CustomerID).Error; err == nil {
				earned := int(sale.TotalAmount * loyaltyPointsPerKyat)
				if earned > 0 {
					customer.Points += earned
					if err := tx.Save(&customer).Error; err != nil {
						return err
					}
				}
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
	if err := config.DB.Preload("User").Preload("Customer").Preload("Items").Preload("Items.Product").First(&loadedSale, sale.ID).Error; err != nil {
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

	productName := strings.TrimSpace(c.Query("product_name"))
	fromDate := strings.TrimSpace(c.Query("from_date"))
	toDate := strings.TrimSpace(c.Query("to_date"))

	// Build a reusable query scope that applies all active filters
	buildQuery := func(db *gorm.DB) *gorm.DB {
		q := db.Model(&models.Sale{}).Where("sales.is_deleted = ?", false)
		if productName != "" {
			q = q.Joins("JOIN sale_items ON sale_items.sale_id = sales.id AND sale_items.is_deleted = ?", false).
				Joins("JOIN products ON products.id = sale_items.product_id").
				Where("products.name ILIKE ?", "%"+productName+"%").
				Group("sales.id")
		}
		if fromDate != "" {
			q = q.Where("sales.created_at >= ?", fromDate)
		}
		if toDate != "" {
			q = q.Where("sales.created_at <= ?", toDate+" 23:59:59")
		}
		return q
	}

	filtersSig := fmt.Sprintf("pn_%s_fd_%s_td_%s", productName, fromDate, toDate)
	cacheKey := fmt.Sprintf("%s%d_size_%d_%s", salesCachePrefix, page, pageSize, filtersSig)
	if cached, ok := cache.Default.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	var total int64
	buildQuery(config.DB).Distinct("sales.id").Count(&total)

	var sales []models.Sale
	// Fetch physical sales records preloading user details and all item lines
	result := buildQuery(config.DB).
		Preload("User").
		Preload("Items", "is_deleted = ?", false).
		Preload("Items.Product").
		Order("sales.id DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&sales)
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
	if result := config.DB.Preload("User").Preload("Items", "is_deleted = ?", false).Preload("Items.Product").Where("is_deleted = ?", false).First(&sale, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale record not found"})
		return
	}

	cache.Default.Set(cacheKey, sale, 30*time.Second)
	c.JSON(http.StatusOK, sale)
}

func DeleteSale(c *gin.Context) {
	id := c.Param("id")

	// Start a transaction to ensure stock restoration and soft deletion happen atomically
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		var sale models.Sale
		if err := tx.Preload("Items").Where("is_deleted = ?", false).First(&sale, id).Error; err != nil {
			return err
		}

		// Restore stock for each item in the sale
		for _, item := range sale.Items {
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err == nil {
				product.StockQuantity += item.Quantity
				if err := tx.Save(&product).Error; err != nil {
					return err
				}
			}
		}

		// Mark sale items as deleted
		if err := tx.Model(&models.SaleItem{}).Where("sale_id = ?", sale.ID).Update("is_deleted", true).Error; err != nil {
			return err
		}

		// Mark sale as deleted
		if err := tx.Model(&models.Sale{}).Where("id = ?", sale.ID).Update("is_deleted", true).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sale: " + err.Error()})
		return
	}

	// Clear caches
	cache.Default.DeletePrefix(salesCachePrefix)
	cache.Default.DeletePrefix(saleDetailsAPIKey)
	cache.Default.Delete("dashboard_stats")

	c.JSON(http.StatusOK, gin.H{"message": "Sale deleted successfully"})
}
