package controllers

import (
	"net/http"
	"time"

	"shop_pos_backend/cache"
	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
)

const categoriesCacheKey = "categories_all"

func CreateCategory(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if result := config.DB.Create(&category); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	cache.Default.Delete(categoriesCacheKey)
	c.JSON(http.StatusOK, category)
}

func GetCategories(c *gin.Context) {
	if cached, ok := cache.Default.Get(categoriesCacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	var categories []models.Category
	if result := config.DB.Find(&categories); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categories"})
		return
	}

	cache.Default.Set(categoriesCacheKey, categories, 2*time.Minute)
	c.JSON(http.StatusOK, categories)
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if result := config.DB.First(&category, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Save(&category)
	cache.Default.Delete(categoriesCacheKey)
	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if result := config.DB.Delete(&models.Category{}, id); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	cache.Default.Delete(categoriesCacheKey)
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}
