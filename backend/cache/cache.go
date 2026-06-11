package cache

import (
	"context"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
	Default     = New(2*time.Minute, 30*time.Second)
)

type item struct {
	value      interface{}
	expiration int64
}

type Cache struct {
	items             map[string]item
	mu                sync.RWMutex
	defaultExpiration time.Duration
}

func New(defaultExpiration, cleanupInterval time.Duration) *Cache {
	c := &Cache{
		items:             make(map[string]item),
		defaultExpiration: defaultExpiration,
	}
	if cleanupInterval > 0 {
		go func() {
			ticker := time.NewTicker(cleanupInterval)
			defer ticker.Stop()
			for range ticker.C {
				c.cleanup()
			}
		}()
	}
	return c
}

func InitRedis() error {
	if redisClient != nil {
		return nil
	}

	var opts *redis.Options
	if url := strings.TrimSpace(os.Getenv("REDIS_URL")); url != "" {
		parsed, err := redis.ParseURL(url)
		if err != nil {
			return err
		}
		opts = parsed
	} else if host := strings.TrimSpace(os.Getenv("REDIS_HOST")); host != "" {
		port := strings.TrimSpace(os.Getenv("REDIS_PORT"))
		if port == "" {
			port = "6379"
		}
		db := 0
		if dbStr := strings.TrimSpace(os.Getenv("REDIS_DB")); dbStr != "" {
			if parsedDB, err := strconv.Atoi(dbStr); err == nil {
				db = parsedDB
			}
		}
		opts = &redis.Options{
			Addr:     host + ":" + port,
			Password: strings.TrimSpace(os.Getenv("REDIS_PASSWORD")),
			DB:       db,
		}
	}

	if opts == nil {
		return nil
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return err
	}

	redisClient = client
	return nil
}

func (c *Cache) Set(key string, value interface{}, duration time.Duration) {
	if duration <= 0 {
		duration = c.defaultExpiration
	}

	if redisClient != nil {
		payload, err := json.Marshal(value)
		if err == nil {
			redisClient.Set(ctx, key, payload, duration)
		}
		return
	}

	var expiration int64
	if duration > 0 {
		expiration = time.Now().Add(duration).UnixNano()
	}

	c.mu.Lock()
	c.items[key] = item{
		value:      value,
		expiration: expiration,
	}
	c.mu.Unlock()
}

func (c *Cache) Get(key string) (interface{}, bool) {
	if redisClient != nil {
		payload, err := redisClient.Get(ctx, key).Bytes()
		if err == nil {
			var decoded interface{}
			if json.Unmarshal(payload, &decoded) == nil {
				return decoded, true
			}
		}
		return nil, false
	}

	c.mu.RLock()
	itm, found := c.items[key]
	c.mu.RUnlock()
	if !found {
		return nil, false
	}
	if itm.expiration > 0 && time.Now().UnixNano() > itm.expiration {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}
	return itm.value, true
}

func (c *Cache) Delete(key string) {
	if redisClient != nil {
		redisClient.Del(ctx, key)
		return
	}

	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

func (c *Cache) DeletePrefix(prefix string) {
	if redisClient != nil {
		iter := redisClient.Scan(ctx, 0, prefix+"*", 0).Iterator()
		for iter.Next(ctx) {
			redisClient.Del(ctx, iter.Val())
		}
		return
	}

	c.mu.Lock()
	for key := range c.items {
		if strings.HasPrefix(key, prefix) {
			delete(c.items, key)
		}
	}
	c.mu.Unlock()
}

func (c *Cache) cleanup() {
	c.mu.Lock()
	for k, itm := range c.items {
		if itm.expiration > 0 && time.Now().UnixNano() > itm.expiration {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()
}
