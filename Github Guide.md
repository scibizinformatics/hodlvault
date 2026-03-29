Here is the complete, updated Master Git Reference Guide. You can copy and paste this entire block into your documentation.

Master Git Reference Guide

1. The "One-Time" Setup Commands

Use these only when starting a brand new project folder or connecting to a new GitHub repository for the first time.

# git init

The Big Bang. Turns your current folder into a Git repository.

# git remote add origin <url>

The Link. Connects your local folder to a specific repository on the GitHub cloud.

# git branch -M main

The Rename. Sets your primary timeline to "main".

# git push -u origin main

The First Upload. Uploads your code to the cloud for the first time.

2. The Daily Workflow (The Loop)

Use these every time you finish a feature, fix a bug, or get a successful result from the AI.

# git add .

The Stage. Gathers all changed files and prepares them for the snapshot.

# git commit -m "message"

The Snapshot. Permanently saves the current state of your files to your local history.

# git push

The Sync. Uploads your local snapshots to GitHub.

3. Nested Repository Management (The "Deep Clean" Fix)

Use these when you accidentally place a folder that contains its own .git repository inside your main project.

# git rm -r -f --cached "Folder Name"

The Force Unlink. Forces the removal of a nested repository link from your index so Git stops tracking it as a submodule.

find "Folder Name" -name ".git" -type d -exec rm -rf {} +

The "Nuke" Command. Searches deep inside a target folder and deletes every hidden .git tracker found.
Note: This does not delete source code; it only deletes the internal Git tracking history.

.gitignore (File)

The Ignore List. Add the folder name (e.g., Folder Name/) to this file to prevent Git from ever scanning it again.

4. Time Travel & History Management

Use these commands to view past versions of your project or revert to a previous state.

# git log --oneline

The Map. Displays a list of all your previous commits with their unique "Hash" IDs.

# git checkout <hash>

The Peek. Allows you to "travel" to a specific past commit to view your code exactly as it was at that time.
Example: git checkout 122ea84
Note: You are now in "Detached HEAD" mode—you can look at your files, but do not make new commits here.

# git checkout main

The Return. Jumps back to the "present" (the latest state of your project).
Example: git checkout main

# git reset --hard <hash>

The Time Warp. Permanently moves your current project back to a specific commit and deletes all work done after that point.
Example: git reset --hard 74ede1e
Warning: This is destructive. Any work saved after that commit will be deleted forever from your local computer.

5. The "Panic Buttons" (Undo & Fixes)

Use these when things go wrong locally and you want to undo recent unsaved changes.

# git checkout .

The Nuclear Undo. Deletes ALL local changes made since your last commit.

# git status

The Status Report. Tells you which files have been modified and the current state of your repository.

6. The "Overwrite Protocol" (Switching Repos & Hard Resets)

Use these commands if you need to point your folder to a NEW repository or completely overwrite your local files with what is in the Cloud.

# git remote set-url origin <new_url>

The Edit Contact. Updates the link to a new GitHub repository URL.

# git fetch origin

The Download. Downloads the latest history/data from the cloud to your computer without touching your files.

# git reset --hard origin/main

The Clone / Overwrite. Destroys local work and makes your files look EXACTLY like the version on the cloud.

7. The "Force Upload" (Overwriting Cloud with Local)

Use this if you get the error ! [rejected] ... fetch first.

# git push -f origin main

The Force Push. Deletes the cloud history and replaces it with your current local version. Use with caution.

Pro-Tip: The Cursor UI Shortcut

# git add . = Clicking the + (Plus) icon in the Source Control sidebar.

# git commit = Typing a message in the box and clicking Commit.

# git push = Clicking the blue Sync Changes button.

# git checkout . = Clicking the Curved Arrow (Discard Changes) icon on the file list.

8. Worktree Management (Multiple Workspaces)

Use these commands when working with AI assistants or when you need multiple isolated workspaces for the same project.

# git worktree list

The Inventory. Shows all active worktrees, their paths, and which branches they're using.
Example output: Shows your main folder plus any AI-created worktree folders.

# git worktree add <path> <branch>

The Clone Door. Creates a new worktree folder for working on a different branch simultaneously.
Example: git worktree add ../feature-branch feature-branch
Note: This creates a physical folder where you can work on a separate branch without switching.

# git worktree remove <path>

The Clean Sweep. Safely removes a worktree folder and updates Git's records automatically.
Example: git worktree remove C:/Users/Unstats/.windsurf/worktrees/hodl-vault-app/hodl-vault-app-cdabccf7
Note: Use the exact path from 'git worktree list' output.

# git worktree prune

The Garbage Collector. Cleans up references to worktrees that were deleted manually.
Use this when: You deleted worktree folders using File Explorer instead of 'git worktree remove'.

# git branch -D <branch-name>

The Branch Delete. Removes a branch permanently from your local repository.
Example: git branch -D cascade/experimental-feature
Warning: Cannot delete a branch that's still being used by an active worktree.

9. Worktree & Branch Creation (The Complete Setup)

Use these procedures to create organized worktrees and branches for simultaneous feature development.

# git checkout -b <branch-name>

The Timeline. Creates a new branch timeline from your current location.
Example: git checkout -b feature-authentication
Note: This creates a branch pointer, not a worktree folder.

# git branch <branch-name>

The Bookmark. Creates a branch without switching to it.
Example: git branch feature-payment
Use when: You want to create the branch first, then create a worktree for it.

# git worktree add <path> <branch>

The Parallel Universe. Creates a physical worktree folder linked to a specific branch.
Example: git worktree add ../feature-auth feature-auth
Note: Each worktree folder can only check out one branch at a time.

# git worktree add <path> <branch> -b <new-branch>

The Combo Move. Creates both a new branch AND a new worktree simultaneously.
Example: git worktree add ../feature-dashboard -b feature-dashboard
Use when: You want to create a brand new feature with its own workspace.

10. Worktree Organization Strategies

Use these patterns to organize your development workflow.

Strategy A: Multiple Worktrees for Multiple Features (Recommended for Complex Projects)

1. Create branches for all features first:
   git checkout -b feature-auth
   git checkout -b feature-payment
   git checkout -b feature-dashboard

2. Create worktrees for each feature:
   git worktree add ../auth-workspace feature-auth
   git worktree add ../payment-workspace feature-payment
   git worktree add ../dashboard-workspace feature-dashboard

3. Work in isolated environments:
   cd ../auth-workspace (work on authentication only)
   cd ../payment-workspace (work on payment system only)
   cd ../dashboard-workspace (work on dashboard only)

Strategy B: Single Worktree with Sequential Branching (Simple Projects)

1. Stay in main folder and create branches as needed:
   git checkout -b feature-auth
   git add . && git commit -m "Start authentication feature"
2. Switch branches when starting new features:
   git checkout feature-payment
   git add . && git commit -m "Start payment feature"

3. Use stash to save incomplete work:
   git stash push -m "auth work in progress"
   git checkout feature-payment

Strategy C: Worktree Per Epic (Large Projects)

1. Group related features into epics:
   git checkout -b epic-user-management
   git checkout -b epic-payment-system

2. Create worktrees for each epic:
   git worktree add ../user-management epic-user-management
   git worktree add ../payment-system epic-payment-system

3. Create feature branches inside epic worktrees:
   cd ../user-management
   git checkout -b feature-login
   git checkout -b feature-profile

4. Worktree Maintenance & Cleanup

Use these commands to keep your worktrees organized and clean.

# git worktree list

The Census. Shows all active worktrees and their current branches.
Use this first to see what needs cleanup.

# git worktree remove --force <path>

The Forced Eviction. Removes a worktree even if it has uncommitted changes.
Example: git worktree remove --force ../old-feature
Warning: This will delete all uncommitted changes in that worktree.

# git branch -D <branch-name>

The Memory Wipe. Deletes a branch permanently.
Example: git branch -D cascade/experimental-feature
Note: Only delete branches after removing their worktrees first.

# git worktree prune

The Housekeeping. Removes stale worktree references.
Use when: You deleted worktree folders manually and need to clean up Git's records.

Complete Cleanup Workflow:

1. Survey your worktrees:
   git worktree list

2. Remove unwanted worktrees:
   git worktree remove ../feature-auth
   git worktree remove ../feature-payment

3. Delete associated branches:
   git branch -D feature-auth
   git branch -D feature-payment

4. Clean up Git's memory:
   git worktree prune

Important Rules:

- Always remove worktrees BEFORE deleting their branches
- Each worktree folder = one branch at a time
- Branch creation is identical in all worktrees
- Multiple worktrees = simultaneous development
- Single worktree = sequential development

12. Repository Setup Strategies (The Smart Start)

Use these patterns to avoid Git setup conflicts and ensure smooth repository initialization.

# git clone <url>

The Clean Start. Downloads an existing repository with proper history connection.
Example: git clone https://github.com/username/repo-name.git
Use when: Starting with existing GitHub repository (RECOMMENDED).

# git init

The Fresh Start. Creates a new local repository from scratch.
Example: git init
Use when: Starting completely new project that doesn't exist anywhere yet.

# git remote add origin <url>

The Link. Connects your local repository to a GitHub repository.
Example: git remote add origin https://github.com/username/repo-name.git
Use when: Connecting existing local project to empty GitHub repository.

# git remote remove origin

The Divorce. Disconnects your local repository from current GitHub repository.
Example: git remote remove origin
Use when: Moving your project to a different GitHub repository.

# git push -u origin main --allow-unrelated-histories

The Bridge. Forces connection between two separate Git histories.
Example: git push -u origin main --allow-unrelated-histories
Use when: You have local project and GitHub repo with different starting points.

Repository Setup Workflows:

Workflow A: GitHub First (Best for New Projects)

1. Create empty repository on GitHub website
2. Clone repository locally:
   git clone https://github.com/username/repo-name.git
3. Start working normally:
   git add . && git commit -m "Start project" && git push

Workflow B: Local First (When You Have Existing Code)

1. Work on project locally until ready
2. Create empty repository on GitHub
3. Connect and force initial push:
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main --allow-unrelated-histories

Workflow C: Repository Migration (Moving Between Repositories)

1. Remove old remote connection:
   git remote remove origin
2. Add new remote connection:
   git remote add origin https://github.com/username/new-repo-name.git
3. Push to new location:
   git push -u origin main

Setup Troubleshooting:

Error: "no upstream branch"
Fix: git push -u origin main

Error: "fetch first"
Fix: git pull origin main

Error: "unrelated histories"
Fix: git pull origin main --allow-unrelated-histories

Key Principles:

- Clone first when possible (avoids history conflicts)
- Local first when you have existing code to upload
- Always use --allow-unrelated-histories for first-time connections
- Remote changes require git pull before git push

13. Branch Management & Collaboration (Team Workflows)

Use these commands and patterns when working with branches for features, bugs, or team collaboration.

# git checkout -b <branch-name>

The Timeline Split. Creates a new branch from your current location.
Example: git checkout -b feature-authentication
Use when: Starting new feature or bug fix work.

# git branch <branch-name>

The Bookmark. Creates a branch without switching to it.
Example: git branch feature-payment
Use when: Creating branch for someone else to work on.

# git checkout <branch-name>

The Timeline Jump. Switches to an existing branch.
Example: git checkout main
Use when: Moving between different features or fixes.

# git branch -D <branch-name>

The Memory Wipe. Deletes a branch permanently.
Example: git branch -D old-feature
Warning: Cannot delete branch if it's being used by a worktree.

# git push -u origin <branch-name>

The Remote Share. Uploads a new branch to GitHub for others to see.
Example: git push -u origin feature-authentication
Use when: Sharing branch with team members or mentor.

# git merge <branch-name>

The Combination. Merges another branch's changes into your current branch.
Example: git merge feature-authentication
Use when: Bringing completed feature into main branch.

# git diff <branch1> <branch2>

The Comparison. Shows differences between two branches.
Example: git diff main feature-authentication
Use when: Reviewing changes before merging.

Collaboration Workflows:

Workflow A: Mentor Help Setup

1. Create clean branch for mentor:
   git checkout -b mentor-help-bugfix
   
2. Push branch to GitHub:
   git push -u origin mentor-help-bugfix
   
3. Share GitHub link with mentor:
   https://github.com/username/repo/tree/mentor-help-bugfix
   
4. Switch back to your own work:
   git checkout main
   git checkout -b my-attempt

Workflow B: Team Feature Development

1. Create feature branch:
   git checkout -b feature-new-dashboard
   
2. Work and commit changes:
   git add . && git commit -m "Add dashboard layout"
   
3. Push for team review:
   git push -u origin feature-new-dashboard
   
4. Team member reviews and merges:
   git checkout main
   git merge feature-new-dashboard

Workflow C: Bug Fix Isolation

1. Create bug fix branch:
   git checkout -b fix-login-issue
   
2. Test and fix the bug:
   git add . && git commit -m "Fix login validation"
   
3. Push and test:
   git push -u origin fix-login-issue
   
4. Merge when confirmed:
   git checkout main
   git merge fix-login-issue

14. Common Git Errors & Solutions (The Troubleshooting Guide)

Use these fixes for the most common Git problems you'll encounter.

Error: "no upstream branch"

The Problem: Local branch doesn't know which remote branch to push to.
The Fix: git push -u origin main
Use when: First time pushing a new branch.

Error: "fetch first" / "non-fast-forward"

The Problem: Remote has commits your local branch doesn't have.
The Fix: git pull origin main
Use when: Someone else pushed changes before you.

Error: "unrelated histories"

The Problem: Two separate Git histories that never connected.
The Fix: git pull origin main --allow-unrelated-histories
Use when: Connecting local project to existing GitHub repo.

Error: "Cannot update paths and switch to branch"

The Problem: Branch name contains spaces or special characters.
The Fix: git checkout -b branch-name-with-hyphens
Use when: Creating branches with readable names.

Error: "refusing to merge unrelated histories"

The Problem: Git won't merge two completely separate histories.
The Fix: git pull origin main --allow-unrelated-histories
Use when: First-time repository connection.

Error: "worktree contains modified files"

The Problem: Trying to delete worktree with uncommitted changes.
The Fix: git worktree remove --force <path>
Use when: Cleaning up AI experiment worktrees.

15. Project Duplication & Snapshots (The Backup System)

Use these commands to create copies of your project for testing or backup.

# git clone <url> <destination>

The Perfect Copy. Downloads complete repository with all history.
Example: git clone https://github.com/user/repo.git ../backup-copy
Use when: Creating complete project duplicate.

# git clone --branch <branch-name> <url>

The Snapshot Copy. Downloads specific branch state.
Example: git clone --branch v1.2.0 https://github.com/user/repo.git ../version-1-2
Use when: Need specific version or branch.

# git clone --depth 1 <url>

The Lightweight Copy. Downloads only latest state (no history).
Example: git clone --depth 1 https://github.com/user/repo.git ../quick-copy
Use when: Need current files only, faster download.

# git archive --format zip --output <file> HEAD

The Time Capsule. Creates zip archive of current state.
Example: git archive --format zip --output ../project-backup.zip HEAD
Use when: Creating snapshot without Git repository.

# git checkout <commit-hash>

The Time Machine. Goes to specific point in history.
Example: git checkout abc1234
Use when: Need to see or work from specific commit.

Backup Strategies:

Strategy A: Complete Project Backup
1. Clone to backup location:
   git clone https://github.com/user/repo.git ../project-backup
   
2. Work independently in both locations:
   cd ../project-backup (backup version)
   cd ../project (main version)

Strategy B: Version Snapshots
1. Create dated backups:
   git clone --depth 1 https://github.com/user/repo.git ../backups/$(date +%Y%m%d)
   
2. Creates folders like:
   backups/20250327/, backups/20250328/, etc.

Strategy C: Feature Branch Backup
1. Create backup branch:
   git checkout -b backup-before-big-changes
   
2. Push for safekeeping:
   git push -u origin backup-before-big-changes

16. Git Graph Colors & Visualization (Understanding the Display)

Use this guide to understand what Git graph colors and symbols mean.

Color Meanings (VS Code Git Graph):

Blue = Your current active branch
- Blue dots = Commits on your current branch
- Blue labels = Your local branch names

Purple/Orange = Remote branches
- Purple dots = Commits on remote branches
- Purple labels = Remote branch names (origin/main, etc.)

Mixed Colors = Merged histories
- Different colors show different lineages
- Merge commits connect different colored lines

Graph Symbols:

Target icon (📍) = Currently checked-out branch/commit
Circle dots = Individual commits
Lines = Parent-child relationships between commits
Labels = Branch names pointing to specific commits

Common Graph Patterns:

Linear line = Straight history, no branches
Split lines = Branch creation
Joined lines = Merge operations
Parallel lines = Separate development paths

What This Means for Your Workflow:

- Orange dots = Your local work
- Blue dots = Your current branch
- Purple dots = Remote/GitHub state
- Mixed colors = Merged histories from different sources

Understanding your Git graph helps you:
- See where branches diverged
- Understand merge conflicts
- Track project history
- Identify which commits belong to which branches
