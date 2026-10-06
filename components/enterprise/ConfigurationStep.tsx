'use client';

import { useState } from 'react';
import steps from './EnterpriseSteps.module.css';
import { AGENT_ROLES, maxAgentsForTier } from './roles';

interface Props {
  tier: string;
  onComplete: (data: any) => void;
}

export default function ConfigurationStep({ tier, onComplete }: Props) {
  const maxAgents = maxAgentsForTier(tier);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENT_ROLES.slice(0, maxAgents).map((a) => a.id));
  const [llmProvider, setLlmProvider] = useState('anthropic');

  const toggleAgent = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== id));
    } else if (selectedAgents.length < maxAgents) {
      setSelectedAgents([...selectedAgents, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ selectedAgents, llmProvider, maxAgents });
  };

  return (
    <form onSubmit={handleSubmit} className={steps.stepForm}>
      <h2 className={steps.stepHeading}>Configure Your Team</h2>
      <p className={steps.stepIntro}>
        Select up to {maxAgents} agents for your {tier} plan. You can adjust this later.
      </p>

      <div className={steps.agentList}>
        {AGENT_ROLES.map((role) => {
          const selected = selectedAgents.includes(role.id);
          const disabled = !selected && selectedAgents.length >= maxAgents;
          return (
            <label
              key={role.id}
              className={disabled ? steps.agentRowDisabled : selected ? steps.agentRowSelected : steps.agentRow}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => toggleAgent(role.id)}
              />
              <div>
                <div className={steps.agentName}>{role.name}</div>
                <div className={steps.agentBlurb}>{role.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>LLM Provider</span>
        <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} className={steps.select}>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="google">Google (Gemini)</option>
          <option value="groq">Groq (Llama)</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </label>

      <p className={steps.stepNote}>
        Selected: {selectedAgents.length}/{maxAgents} agents
      </p>

      <button type="submit" disabled={selectedAgents.length === 0} className={steps.submitButton}>
        Review & Deploy
      </button>
    </form>
  );
}


