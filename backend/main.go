package main

import (
	"log"
	"os"

	"shop_pos_backend/config"
	"shop_pos_backend/models"
	"shop_pos_backend/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file, relying on environment variables")
	}

	// Connect to Database
	config.ConnectDB()

	// Migrate Models
	config.DB.AutoMigrate(&models.User{}, &models.Category{}, &models.Product{}, &models.Sale{}, &models.SaleItem{}, &models.Customer{})

	// Seed demo data when explicitly enabled (truncates & reloads catalog)
	if os.Getenv("SEED") == "true" {
		SeedDatabase()
	}

	// Create a default admin user if none exists
	var admin models.User
	if err := config.DB.Where("username = ?", "admin").First(&admin).Error; err != nil {
		// Admin not found, create one
		// This password should be hashed in production properly, but we'll use a hashed "admin" here.
		// password := "$2a$10$wE9... " - for simplicity, we'll let them register an admin or just use a basic hash
		log.Println("No admin found. You might want to register a user.")
	}

	r := gin.Default()

	// CORS Setup
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Setup Routes
	routes.SetupRoutes(r)

	// Run Server
	r.Run(":8080")
}