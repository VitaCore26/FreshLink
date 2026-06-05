#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════════
# SCRIPT: Backup Before Migration
# Purpose: Automated backup of all critical data before account migration
# Usage: bash scripts/backup_before_migration.sh
# ═══════════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./MIGRATION_BACKUPS_$(date +%Y%m%d_%H%M%S)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔄 PRE-MIGRATION BACKUP SCRIPT${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 1: Verify prerequisites
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Please install git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ In git repository${NC}"

# Check git status
if [[ $(git status --porcelain) ]]; then
    echo -e "${YELLOW}⚠️  WARNING: Uncommitted changes detected!${NC}"
    echo "Please commit or stash changes first:"
    echo "  git add ."
    echo "  git commit -m 'Pre-migration commit'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 2: Create backup directory
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 2: Creating backup directory...${NC}"

mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory created: $BACKUP_DIR${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 3: Backup Git repository
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 3: Backing up Git repository...${NC}"

# Full mirror clone
echo "   Creating full mirror clone..."
git clone --mirror . "$BACKUP_DIR/git_mirror"
echo -e "${GREEN}✓ Git mirror created${NC}"

# Git bundle (single file backup)
echo "   Creating git bundle..."
git bundle create "$BACKUP_DIR/Fresh_Link_Pro_$TIMESTAMP.bundle" --all
echo -e "${GREEN}✓ Git bundle created$(NC)"

# Get repo info
echo "   Collecting repository info..."
{
    echo "# Git Repository Information"
    echo "## Backup Date: $TIMESTAMP"
    echo ""
    echo "## Branches"
    git branch -a
    echo ""
    echo "## Recent Commits (last 20)"
    git log --oneline -20
    echo ""
    echo "## Repository Size"
    du -sh .
    echo ""
    echo "## Current Hash"
    git rev-parse HEAD
} > "$BACKUP_DIR/git_info.txt"
echo -e "${GREEN}✓ Repository info saved${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 4: Backup environment variables
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 4: Backing up environment configuration...${NC}"

if [ -f .env.local ]; then
    echo "   Found .env.local"
    cp .env.local "$BACKUP_DIR/.env.local.backup"
    # Create a masked version for reference
    sed 's/=.*/=REDACTED/' .env.local > "$BACKUP_DIR/.env.local.masked"
    echo -e "${GREEN}✓ .env.local backed up (original + masked)${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
fi

if [ -f .env ]; then
    echo "   Found .env"
    cp .env "$BACKUP_DIR/.env.backup"
    sed 's/=.*/=REDACTED/' .env > "$BACKUP_DIR/.env.masked"
    echo -e "${GREEN}✓ .env backed up (original + masked)${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 5: Backup project structure
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 5: Documenting project structure...${NC}"

{
    echo "# Project Structure"
    echo "## Backup Date: $TIMESTAMP"
    echo ""
    echo "## Directory Tree"
    find . -type f -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sql" | head -50
    echo ""
    echo "## Key Configuration Files"
    echo "### package.json"
    cat package.json
    echo ""
    echo "### tsconfig.json"
    cat tsconfig.json 2>/dev/null || echo "Not found"
    echo ""
    echo "### next.config.js"
    cat next.config.js 2>/dev/null || echo "Not found"
} > "$BACKUP_DIR/project_structure.md"
echo -e "${GREEN}✓ Project structure documented${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 6: Create Supabase extraction instructions
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 6: Creating Supabase export instructions...${NC}"

{
    echo "# Supabase Data Export Instructions"
    echo ""
    echo "## Step 1: Via Supabase Dashboard"
    echo ""
    echo "1. Go to: https://app.supabase.com"
    echo "2. Select your project"
    echo "3. Go to: Settings > Backups"
    echo "4. Click: 'Create backup'"
    echo "5. Wait for completion"
    echo "6. Click the backup > Download"
    echo "7. Save to: $BACKUP_DIR/supabase_backup.sql"
    echo ""
    echo "## Step 2: Via pgdump (if available)"
    echo ""
    echo "PGPASSWORD='YOUR_PASSWORD' pg_dump \\"
    echo "  --host db.YOUR_PROJECT_ID.supabase.co \\"
    echo "  --user postgres \\"
    echo "  --format custom \\"
    echo "  postgres > $BACKUP_DIR/supabase_backup.sql"
    echo ""
    echo "## Important:"
    echo "- Keep the export file SAFE and SECURE"
    echo "- It contains production data"
    echo "- Store in 2+ locations"
    echo "- Never commit to git"
    echo "- Use strong encryption if sharing"
} > "$BACKUP_DIR/SUPABASE_EXPORT_INSTRUCTIONS.md"
echo -e "${GREEN}✓ Supabase export instructions created${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 7: Create migration checklist
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 7: Creating migration checklist...${NC}"

{
    echo "# Pre-Migration Checklist"
    echo "Date: $TIMESTAMP"
    echo ""
    echo "## Backups Created"
    echo "- [ ] Git mirror clone"
    echo "- [ ] Git bundle"
    echo "- [ ] .env.local backup"
    echo "- [ ] Project structure documentation"
    echo ""
    echo "## Supabase (TODO)"
    echo "- [ ] Create Supabase backup"
    echo "- [ ] Download & save to: $BACKUP_DIR/"
    echo "- [ ] Verify backup integrity"
    echo "- [ ] Document table counts"
    echo ""
    echo "## GitHub (TODO)"
    echo "- [ ] Create new GitHub account"
    echo "- [ ] Create new repository"
    echo "- [ ] Configure SSH keys"
    echo ""
    echo "## Vercel (TODO)"
    echo "- [ ] Create new Vercel account"
    echo "- [ ] Connect new GitHub account"
    echo "- [ ] Configure environment variables"
    echo ""
    echo "## Migration"
    echo "- [ ] Push code to new GitHub"
    echo "- [ ] Import data to new Supabase"
    echo "- [ ] Deploy on new Vercel"
    echo "- [ ] Test application"
    echo ""
    echo "## Post-Migration"
    echo "- [ ] Verify all data migrated"
    echo "- [ ] Verify RLS policies active"
    echo "- [ ] Test authentication"
    echo "- [ ] Archive old accounts"
} > "$BACKUP_DIR/MIGRATION_CHECKLIST.md"
echo -e "${GREEN}✓ Migration checklist created${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# STEP 8: Create summary
# ═══════════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Step 8: Creating backup summary...${NC}"

{
    echo "# Migration Backup Summary"
    echo ""
    echo "Date: $TIMESTAMP"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "## What's Included"
    echo ""
    ls -lh "$BACKUP_DIR/"
    echo ""
    echo "## Next Steps"
    echo ""
    echo "1. **CRITICAL: Backup to external storage**"
    echo "   cp -r $BACKUP_DIR /path/to/usb_drive/"
    echo "   cp -r $BACKUP_DIR /path/to/cloud_storage/"
    echo ""
    echo "2. **Export Supabase Data**"
    echo "   See: $BACKUP_DIR/SUPABASE_EXPORT_INSTRUCTIONS.md"
    echo ""
    echo "3. **Start Migration Process**"
    echo "   Follow: MIGRATION_COMPLETE_ACCOUNTS.md"
    echo ""
    echo "4. **Use Checklist**"
    echo "   Track progress: MIGRATION_CHECKLIST.md"
    echo ""
    echo "## Important Notes"
    echo ""
    echo "- Keep backups in 2+ secure locations"
    echo "- Never commit backup files to git"
    echo "- Verify backup integrity before deletion"
    echo "- Keep these backups for at least 30 days"
    echo "- If migration fails, you can restore from these backups"
} > "$BACKUP_DIR/BACKUP_SUMMARY.txt"

cat "$BACKUP_DIR/BACKUP_SUMMARY.txt"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════════
# FINAL STATUS
# ═══════════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ BACKUP COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT ACTIONS (in order):${NC}"
echo ""
echo "1. **BACKUP EXTERNALLY (CRITICAL!)**"
echo "   cp -r $BACKUP_DIR /path/to/usb_drive/"
echo "   cp -r $BACKUP_DIR /path/to/cloud_storage/"
echo ""
echo "2. **EXPORT SUPABASE DATA**"
echo "   Follow instructions in:"
echo "   $BACKUP_DIR/SUPABASE_EXPORT_INSTRUCTIONS.md"
echo ""
echo "3. **START MIGRATION**"
echo "   Follow: MIGRATION_COMPLETE_ACCOUNTS.md"
echo "   Use checklist: $BACKUP_DIR/MIGRATION_CHECKLIST.md"
echo ""
echo -e "${GREEN}Backup directory: $BACKUP_DIR${NC}"
echo ""
echo -e "${RED}⚠️  DO NOT DELETE THIS DIRECTORY UNTIL MIGRATION IS COMPLETE!${NC}"
echo ""
