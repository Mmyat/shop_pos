package config

import (
	"fmt"
	"log"
	"os"
	"strings"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func databaseURL() string {
	// dburl := os.Getenv("DATABASE_URL")
	// if dburl != "" {
	// 	if !strings.Contains(dburl, "sslmode=") {
	// 		if strings.Contains(dburl, "?") {
	// 			dburl += "&sslmode=require"
	// 		} else {
	// 			dburl += "?sslmode=require"
	// 		}
	// 	}
	// 	return dburl
	// }

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "require"
	}

	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Yangon", host, user, password, dbname, port, sslmode)
}

func ConnectDB() {
	dburl := databaseURL()

	db, err := gorm.Open(postgres.Open(dburl), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	DB = db
	log.Println("Database connection successfully opened")
}
