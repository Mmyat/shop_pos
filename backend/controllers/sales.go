package controllers

import (
	"net/http"

	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

	// Start a transaction
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		sale := models.Sale{
			TotalAmount: input.TotalAmount,
			UserID:      uid,
		}

		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		for _, item := range input.Items {
			saleItem := models.SaleItem{
				SaleID:    sale.ID,
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Price:     item.Price,
			}

			if err := tx.Create(&saleItem).Error; err != nil {
				return err
			}

			// Update product stock
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				return err
			}

			product.StockQuantity -= item.Quantity
			if product.StockQuantity < 0 {
				product.StockQuantity = 0 // prevent negative stock, though realistically you'd want an error
			}

			if err := tx.Save(&product).Error; err != nil {
				return err
			}
		}
		return nil
	})

	// Reload the sale with items and product details for the receipt
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sale: " + err.Error()})
		return
	}

	var createdSale models.Sale
	config.DB.Preload("Items").Preload("Items.Product").Preload("User").
		Order("id DESC").First(&createdSale)

	c.JSON(http.StatusOK, createdSale)
}

func GetSales(c *gin.Context) {
	var sales []models.Sale
	if result := config.DB.Preload("Items").Preload("Items.Product").Preload("User").Find(&sales); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve sales"})
		return
	}

	c.JSON(http.StatusOK, sales)
}

func GetSaleByID(c *gin.Context) {
	id := c.Param("id")
	var sale models.Sale
	if result := config.DB.Preload("Items").Preload("Items.Product").Preload("User").First(&sale, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}

	c.JSON(http.StatusOK, sale)
}
