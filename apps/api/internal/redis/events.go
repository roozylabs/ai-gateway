package redis

import (
	"context"
	"encoding/json"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const EventsChannel = "gateway:events"

type Event struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

type EventPublisher struct {
	rdb *goredis.Client
}

func NewEventPublisher(rdb *goredis.Client) *EventPublisher {
	return &EventPublisher{rdb: rdb}
}

func (p *EventPublisher) Publish(ctx context.Context, eventType string, data interface{}) error {
	event := Event{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now().UTC(),
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return p.rdb.Publish(ctx, EventsChannel, payload).Err()
}

func (p *EventPublisher) Subscribe(ctx context.Context) *goredis.PubSub {
	return p.rdb.Subscribe(ctx, EventsChannel)
}
