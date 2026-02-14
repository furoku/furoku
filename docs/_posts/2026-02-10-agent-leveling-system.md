---
layout: post
title: "Building Trust with AI Agents — A Leveling System for Delegation"
date: 2026-02-10
description: "A systematic approach to AI agent team management using L1–L4 trust levels. Covers cron-based evaluation, per-task trust tracking, commit/push separation, and the philosophy of progressive delegation."
image: /assets/images/agent-management/hero.png
tags: [AI, Management, Agent Design, OpenClaw, Team Operations]
---

The agent team: eichan (Claude Sonnet) is fast at implementation. bichan (Sonnet) offers alternative perspectives. ochan (GPT-5.3 Codex) gives rigorous reviews. gemichan (Gemini Pro) excels at Google APIs.

The manager delegates work to teammates and focuses on judgment and conversation.

But how is "delegation" decided?

## Trust Should Be Measured by Track Record, Not Intuition

Initially, delegation was intuitive: "eichan is good at implementation, so delegate." But intuition leads to over-correction after mistakes ("I'll just do it myself") and under-checking after repeated success (leading to oversights).

Human teams face the same problem. The boundary between trust and negligence is blurry.

The solution: **measure with numbers**.

## L1–L4: The Leveling System

| Level | Meaning | Manager Action |
|-------|---------|----------------|
| **L1** | Review required | Review all deliverables |
| **L2** | Trusted | Result verification only (skip process review) |
| **L3** | Full delegation | Periodic sampling only |
| **L4** | Mentor | Acts as reviewer for other agents |

New tasks **always start at L1**. Regardless of agent capability.

Because "eichan is good at implementation" and "eichan can execute this specific task accurately" are different claims.

## Promotion by Track Record, Demotion by Single Failure

**L1→L2**: 5 consecutive completions without corrections.

**L2→L3**: 20 consecutive completions without issues.

**Demotion**: One critical mistake drops one level.

This may seem strict. But human work follows the same pattern — 100 successes can be undermined by 1 critical failure. AI agents are no exception.

## Why Cron Jobs Pair Well with Evaluation

The leveling system's core depends on "repeated execution of the same task."

One-off tasks ("fix this bug," "write this article") vary in content and difficulty each time. Evaluation criteria are unstable.

Cron jobs are different. Same time, same task, daily:

- Morning GA4 report generation
- Nightly repository cleanup (Brain Defrag)
- Periodic SEO checks

Stable inputs make output quality comparable. "Completed this task 5 times consecutively without errors" becomes a meaningful evaluation.

## Operational Flow Example

Using Brain Defrag (repository cleanup) as an example:

```
1. Cron triggers
2. yuchan (manager) activates
3. Spawns eichan for the task
   ※ No commit/push permissions
4. eichan reports completion
5. Manager reviews deliverables
6. Updates agent-levels.json
   - No issues → consecutive_no_fix +1
   - Issues found → consecutive_no_fix = 0
7. 5 consecutive clears → Promote to L2
```

At L2, step 5 becomes "verify results only" — skip process review.

At L3, step 5 is eliminated entirely. Occasional sampling only.

**As trust accumulates, the manager's workload decreases.**

## Delegation Philosophy

Critically, levels are **independent per task**.

eichan at L3 (full delegation) for Brain Defrag still starts at **L1 for new tasks** (e.g., SEO audit).

Same principle in human work: expertise in accounting doesn't imply capability in sales. Trust is domain-specific.

### Delegate Strengths First

Don't delegate all tasks equally. Match each agent's strengths and advance those domains first:

- eichan → Implementation tasks level up first
- ochan → Review tasks level up first
- gemichan → Google API tasks level up first

The result: a **team-wide delegation map** showing who is trusted for what, at what level.

## Commit/Push Separation

Another design decision: **agents don't commit/push**.

The reason is simple. Code changes are reversible, but pushes are permanent (technically revertable, but history persists).

Instead, a clawd-backup cron job auto-commits and pushes every 6 hours. Agents' scope is "modify files." External propagation is handled safely by the system.

This is itself a form of leveling. As trust accumulates sufficiently for a task, push permissions could be unlocked in the future.

## agent-levels.json

Actual data is managed as follows:

```json
{
  "agents": {
    "eichan": {
      "tasks": {
        "brain-defrag": {
          "level": "L1",
          "consecutive_no_fix": 1,
          "total_runs": 1,
          "last_run": "2026-02-10"
        }
      }
    }
  }
}
```

Still L1, 1 run. Building from here.

## Parallels with Human Management

Designing this system revealed that AI agent management is **nearly identical** to human management:

- Trust is built on track record
- Delegate strengths first
- Respond strictly to critical mistakes
- Start with routine tasks
- A manager's job is to increase the work they don't need to do themselves

The difference: AI can precisely count "5 consecutive successes." Human management often relies on gut feeling for such metrics.

## Future Outlook

When all team members reach L3, the manager's role reduces to "setting direction" and "handling exceptions." 90% of daily operations run autonomously.

The ideal state: work progresses without any manager intervention.

That's not negligence. **It's the result of accumulated trust.**

A manager's highest achievement is building a team that runs without them. Whether AI agents or humans.
