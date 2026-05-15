package main

import (
	"database/sql"
	"fmt"

	"shop_pos_backend/config"
	"shop_pos_backend/models"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	_ "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load()

	// 1. Create the database if it doesn't exist
	dsn := "host=localhost user=postgres password=postgres port=5432 sslmode=disable"
	db, err := sql.Open("pgx", dsn)
	if err == nil {
		_, err = db.Exec("CREATE DATABASE shop_pos")
		if err != nil {
			fmt.Println("Database may already exist (or error):", err.Error())
		} else {
			fmt.Println("Database shop_pos created successfully.")
		}
		db.Close()
	} else {
		fmt.Println("Could not connect to base postgres to create DB:", err)
	}

	// 2. Connect to shop_pos and migrate
	config.ConnectDB()
	fmt.Println("Migrating database...")
	config.DB.AutoMigrate(&models.User{}, &models.Category{}, &models.Product{}, &models.Sale{}, &models.SaleItem{})

	// 3. Seed Data
	seedData(config.DB)
}

func seedData(db *gorm.DB) {
	// Seed Admin User
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
		user := models.User{
			Username: "admin",
			Password: string(hash),
			Role:     "admin",
		}
		db.Create(&user)
		fmt.Println("Created default admin user (admin / admin123)")
	}

	// Seed Categories and Products (Clear old ones first to refresh images)
	db.Exec("TRUNCATE products, categories RESTART IDENTITY CASCADE")
	fmt.Println("Refreshing products and categories with new image data...")

	{
		categories := []models.Category{
			{Name: "Beverages", Description: "Drinks and juices"},
			{Name: "Snacks", Description: "Chips, cookies, and quick bites"},
			{Name: "Household", Description: "Cleaning supplies and daily use"},
		}
		db.Create(&categories)
		fmt.Println("Created sample categories")

		// Retrieve categories to get IDs
		var catBev, catSnack, catHouse models.Category
		db.Where("name = ?", "Beverages").First(&catBev)
		db.Where("name = ?", "Snacks").First(&catSnack)
		db.Where("name = ?", "Household").First(&catHouse)

		// Seed Products
		products := []models.Product{
			{Name: "Coca Cola 1L", CategoryID: catBev.ID, Price: 1.50, StockQuantity: 50, LowStockThreshold: 10, Barcode: "000001", ImageURL: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=200&auto=format&fit=crop"},
			{Name: "Orange Juice", CategoryID: catBev.ID, Price: 2.00, StockQuantity: 7, LowStockThreshold: 8, Barcode: "000002", ImageURL: "https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=200&auto=format&fit=crop"},
			{Name: "Potato Chips", CategoryID: catSnack.ID, Price: 1.20, StockQuantity: 100, LowStockThreshold: 15, Barcode: "000003", ImageURL: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=200&auto=format&fit=crop"},
			{Name: "Chocolate Chip Cookies", CategoryID: catSnack.ID, Price: 3.50, StockQuantity: 8, LowStockThreshold: 10, Barcode: "000004", ImageURL: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=200&auto=format&fit=crop"},
			{Name: "Dishwashing Liquid", CategoryID: catHouse.ID, Price: 2.80, StockQuantity: 3, LowStockThreshold: 5, Barcode: "000005", ImageURL: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=200&auto=format&fit=crop"},
			{Name: "Laundry Detergent", CategoryID: catHouse.ID, Price: 5.50, StockQuantity: 0, LowStockThreshold: 3, Barcode: "000006", ImageURL: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=200&auto=format&fit=crop"},
		}
		db.Create(&products)
		fmt.Println("Created sample products")
	}
}
