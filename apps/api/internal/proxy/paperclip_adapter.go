package proxy

import (
	"context"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type PaperclipAgentContext struct {
	AgentID    string `json:"agentId"`
	TaskID     string `json:"taskId"`
	ProjectID  string `json:"projectId"`
	WorkflowID string `json:"workflowId"`
}

type PaperclipAdapter struct {
	agentRepo *repository.AgentRepository
}

func NewPaperclipAdapter(agentRepo *repository.AgentRepository) *PaperclipAdapter {
	return &PaperclipAdapter{
		agentRepo: agentRepo,
	}
}

// ExtractPaperclipContext retrieves Paperclip-specific headers from Gin Context.
func ExtractPaperclipContext(c *gin.Context) *PaperclipAgentContext {
	agentID := strings.TrimSpace(c.GetHeader("X-Paperclip-Agent-ID"))
	if agentID == "" {
		agentID = strings.TrimSpace(c.GetHeader("X-Prism-Agent-ID"))
	}

	taskID := strings.TrimSpace(c.GetHeader("X-Paperclip-Task-ID"))
	projectID := strings.TrimSpace(c.GetHeader("X-Paperclip-Project-ID"))
	workflowID := strings.TrimSpace(c.GetHeader("X-Paperclip-Workflow-ID"))

	if agentID == "" && taskID == "" && projectID == "" {
		return nil
	}

	return &PaperclipAgentContext{
		AgentID:    agentID,
		TaskID:     taskID,
		ProjectID:  projectID,
		WorkflowID: workflowID,
	}
}

// RegisterPaperclipAgent provisions or updates a Paperclip agent profile in Prism.
func (p *PaperclipAdapter) RegisterPaperclipAgent(ctx context.Context, userID, agentID, name, description string, allowedModels, allowedTools []string) (*models.Agent, error) {
	existing, err := p.agentRepo.FindByID(ctx, agentID, userID)
	if err == nil && existing != nil {
		existing.Name = name
		existing.Description = description
		if len(allowedModels) > 0 {
			existing.AllowedModels = allowedModels
		}
		if len(allowedTools) > 0 {
			existing.AllowedTools = allowedTools
		}
		if err := p.agentRepo.Update(ctx, existing); err != nil {
			return nil, err
		}
		return existing, nil
	}

	agent := &models.Agent{
		ID:            agentID,
		UserID:        userID,
		Name:          name,
		DisplayName:   name,
		Description:   description,
		AgentType:     "paperclip_agent",
		AllowedModels: allowedModels,
		AllowedTools:  allowedTools,
		Status:        "active",
		Enabled:       true,
	}

	if err := p.agentRepo.Create(ctx, agent); err != nil {
		return nil, err
	}

	return agent, nil
}
