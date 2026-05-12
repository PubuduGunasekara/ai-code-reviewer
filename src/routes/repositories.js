const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("./auth");

let Octokit;
const getOctokit = async () => {
  if (!Octokit) {
    const octokitModule = await import("@octokit/rest");
    Octokit = octokitModule.Octokit || octokitModule.default;
  }
  return Octokit;
};

const router = express.Router();

// All routes in this file require login
// We apply requireAuth to every route automatically
router.use(requireAuth);

// ─── GET /api/v1/repositories ────────────────────────────────
// List repos the user has connected to our app
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, name, owner, is_private, created_at
       FROM repositories
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    res.json({
      repositories: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("GET /repositories error:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// ─── GET /api/v1/repositories/github ─────────────────────────
// Fetch ALL repos from GitHub API (not just connected ones)
// This is what we show the user when they want to add a new repo
router.get("/github", async (req, res) => {
  try {
    // Create an Octokit instance authenticated as this user
    // req.user.access_token is the GitHub OAuth token we saved at login
    const OctokitClass = await getOctokit();
    const octokit = new OctokitClass({
      auth: req.user.access_token,
    });

    // Fetch all repos this user has access to
    // GitHub paginates — we get up to 100 per page
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated", // most recently updated first
      direction: "desc",
      per_page: 100,
      affiliation: "owner,collaborator", // their own + repos they collaborate on
    });

    // Get which repos the user has already connected
    const connected = await query(
      "SELECT github_repo_id FROM repositories WHERE user_id = $1",
      [req.user.id],
    );
    const connectedIds = new Set(connected.rows.map((r) => r.github_repo_id));

    // Return the list with a "connected" flag on each repo
    const repos = data.map((repo) => ({
      github_repo_id: repo.id,
      full_name: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      is_private: repo.private,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
      connected: connectedIds.has(repo.id), // already connected?
    }));

    res.json({
      repositories: repos,
      count: repos.length,
    });
  } catch (error) {
    console.error("GET /repositories/github error:", error);

    // GitHub API returns 401 if the token is invalid or expired
    if (error.status === 401) {
      return res.status(401).json({
        error: "GitHub token expired",
        message: "Please log in again",
      });
    }

    res.status(500).json({ error: "Failed to fetch GitHub repositories" });
  }
});

// ─── POST /api/v1/repositories ───────────────────────────────
// Connect a GitHub repo to our app
// User selects a repo from the list above → sends its github_repo_id
router.post("/", async (req, res) => {
  try {
    const { github_repo_id } = req.body;

    if (!github_repo_id) {
      return res.status(400).json({
        error: "Missing github_repo_id",
      });
    }

    // Verify this repo actually belongs to the user
    // (don't let users connect repos they don't own)
    const OctokitClass = await getOctokit();
    const octokit = new OctokitClass({ auth: req.user.access_token });

    let repoData;
    try {
      const { data } = await octokit.request(
        "GET /repositories/{repository_id}",
        {
          repository_id: parseInt(github_repo_id),
        },
      );
      repoData = data;
    } catch (error) {
      console.error("GitHub repo fetch error:", error.status, error.message);
      return res.status(404).json({
        error: "Repository not found or not accessible",
      });
    }

    // Check if already connected
    const existing = await query(
      `SELECT id FROM repositories 
       WHERE user_id = $1 AND github_repo_id = $2`,
      [req.user.id, github_repo_id],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Repository already connected",
      });
    }

    // Save to database
    const result = await query(
      `INSERT INTO repositories
         (user_id, github_repo_id, full_name, name, owner, is_private)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        repoData.id,
        repoData.full_name,
        repoData.name,
        repoData.owner.login,
        repoData.private,
      ],
    );

    console.log(
      `Repo connected: ${repoData.full_name} by ${req.user.github_username}`,
    );

    res.status(201).json({
      message: "Repository connected",
      repository: result.rows[0],
    });
  } catch (error) {
    console.error("POST /repositories error:", error);
    res.status(500).json({ error: "Failed to connect repository" });
  }
});

// ─── DELETE /api/v1/repositories/:id ─────────────────────────
// Disconnect a repo from our app
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Make sure this repo belongs to the logged-in user
    // Never trust the client — always verify ownership in the DB
    const result = await query(
      `DELETE FROM repositories
       WHERE id = $1 AND user_id = $2
       RETURNING full_name`,
      [id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found or not owned by you",
      });
    }

    res.json({
      message: `Disconnected: ${result.rows[0].full_name}`,
    });
  } catch (error) {
    console.error("DELETE /repositories error:", error);
    res.status(500).json({ error: "Failed to disconnect repository" });
  }
});

module.exports = router;
