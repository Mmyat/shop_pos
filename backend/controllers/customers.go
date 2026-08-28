package controllers

import (
	"net/http"
	"strings"

	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
)

func GetCustomers(c *gin.Context) {
	page := parsePageParam(c.Query("page"), 1)
	pageSize := parsePageParam(c.Query("page_size"), 20)
	if pageSize > 100 {
		pageSize = 100
	}

	search := strings.TrimSpace(c.Query("search"))

	q := config.DB.Model(&models.Customer{}).Where("is_deleted = ?", false)
	if search != "" {
		q = q.Where("name ILIKE ? OR phone ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Count(&total)

	var customers []models.Customer
	if result := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("name ASC").Find(&customers); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve customers"})
		return
	}

	totalPages := 0
	if pageSize > 0 {
		totalPages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}

	c.JSON(http.StatusOK, gin.H{
		"items":       customers,
		"page":        page,
		"page_size":   pageSize,
		"total":       total,
		"total_pages": totalPages,
	})
}

func GetCustomerByPhone(c *gin.Context) {
	phone := strings.TrimSpace(c.Param("phone"))
	var customer models.Customer
	if result := config.DB.Where("is_deleted = ? AND phone = ?", false, phone).First(&customer); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}
	c.JSON(http.StatusOK, customer)
}

func CreateCustomer(c *gin.Context) {
	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if result := config.DB.Create(&customer); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
		return
	}
	c.JSON(http.StatusOK, customer)
}

func UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	var customer models.Customer
	if result := config.DB.Where("is_deleted = ?", false).First(&customer, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Save(&customer)
	c.JSON(http.StatusOK, customer)
}

func DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	if result := config.DB.Model(&models.Customer{}).Where("id = ?", id).Update("is_deleted", true); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete customer"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Customer deleted successfully"})
}
