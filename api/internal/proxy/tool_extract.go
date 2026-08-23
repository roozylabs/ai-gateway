package proxy

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/roozylabs/ai-gateway/internal/models"
)

type ToolCallRecord = models.ToolCallRecord

func ExtractToolCallsFromResponse(resp *ProviderResponse) []ToolCallRecord {
	if resp == nil {
		return nil
	}
	var recs []ToolCallRecord
	for _, ch := range resp.Choices {
		msg := ch.Message
		if msg == nil {
			continue
		}
		raw, ok := msg["tool_calls"]
		if !ok || raw == nil {
			continue
		}
		arr, ok := raw.([]interface{})
		if !ok {
			continue
		}
		for _, item := range arr {
			tc, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			fn, ok := tc["function"].(map[string]interface{})
			if !ok {
				continue
			}
			name, _ := fn["name"].(string)
			if name == "" {
				continue
			}
			rec := ToolCallRecord{Name: name}
			if id, ok := tc["id"].(string); ok {
				rec.CallID = id
			}
			if argStr, ok := fn["arguments"].(string); ok && argStr != "" {
				rec.Arguments = json.RawMessage(argStr)
			}
			recs = append(recs, rec)
		}
	}
	return recs
}

type streamToolEntry struct {
	id   string
	name strings.Builder
	args strings.Builder
}

type StreamToolAccumulator struct {
	byIndex map[int]*streamToolEntry
}

func NewStreamToolAccumulator() *StreamToolAccumulator {
	return &StreamToolAccumulator{byIndex: make(map[int]*streamToolEntry)}
}

func (a *StreamToolAccumulator) getOrCreate(idx int) *streamToolEntry {
	if e, ok := a.byIndex[idx]; ok {
		return e
	}
	e := &streamToolEntry{}
	a.byIndex[idx] = e
	return e
}

func (a *StreamToolAccumulator) Observe(delta map[string]interface{}) {
	if delta == nil {
		return
	}
	rawTC, ok := delta["tool_calls"]
	if !ok || rawTC == nil {
		return
	}
	arr, ok := rawTC.([]interface{})
	if !ok {
		return
	}
	for _, item := range arr {
		tc, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		idxF, ok := tc["index"].(float64)
		if !ok {
			continue
		}
		idx := int(idxF)
		e := a.getOrCreate(idx)
		if id, ok := tc["id"].(string); ok && id != "" {
			e.id = id
		}
		fn, ok := tc["function"].(map[string]interface{})
		if !ok {
			continue
		}
		if n, ok := fn["name"].(string); ok {
			e.name.WriteString(n)
		}
		if argStr, ok := fn["arguments"].(string); ok {
			e.args.WriteString(argStr)
		}
	}
}

func (a *StreamToolAccumulator) Finish() []ToolCallRecord {
	if len(a.byIndex) == 0 {
		return nil
	}
	indexes := make([]int, 0, len(a.byIndex))
	for idx := range a.byIndex {
		indexes = append(indexes, idx)
	}
	sort.Ints(indexes)
	recs := make([]ToolCallRecord, 0, len(indexes))
	for _, idx := range indexes {
		e := a.byIndex[idx]
		name := e.name.String()
		if name == "" && e.args.Len() == 0 {
			continue
		}
		rec := ToolCallRecord{Name: name, CallID: e.id}
		if s := e.args.String(); s != "" {
			rec.Arguments = json.RawMessage(s)
		}
		recs = append(recs, rec)
	}
	return recs
}
