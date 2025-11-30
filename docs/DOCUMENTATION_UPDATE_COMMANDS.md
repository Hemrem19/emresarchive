# Documentation Update Command List

**Purpose**: Comprehensive guide for coding agents to maintain documentation accuracy as development proceeds  
**Target Audience**: Coding agents, AI assistants, developers  
**Last Updated**: 2025-01-XX

---

## Table of Contents

1. [Introduction](#introduction)
2. [Update Triggers](#update-triggers)
3. [Update Procedures by Volume](#update-procedures-by-volume)
4. [Command Format Specification](#command-format-specification)
5. [Validation Procedures](#validation-procedures)
6. [Examples & Use Cases](#examples--use-cases)
7. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## Introduction

### Purpose

This document provides structured commands and procedures for coding agents to update the comprehensive documentation volumes (Volumes 1-5) as the codebase evolves. The documentation must remain accurate and reflect the current state of the code at all times.

### How to Use This Guide

1. **Identify the Change**: Determine what type of change was made (new feature, API change, etc.)
2. **Find the Trigger**: Locate the relevant trigger in Section 2
3. **Follow Procedures**: Execute the update procedures for affected volumes
4. **Validate**: Run validation checks to ensure accuracy
5. **Update Metadata**: Update "Last Updated" dates in affected documents

### Update Frequency

Documentation should be updated **immediately** when code changes are made. Do not defer documentation updates - they are part of the development process.

### Documentation Structure

- **Volume 1**: General Project Overview
- **Volume 2**: Feature Documentation
- **Volume 3**: Technical Architecture
- **Volume 4**: Reference Manual (Deep Dive)
- **Volume 5**: Maintenance & Operations

---

## Update Triggers

### Feature Changes

- ✅ **New Feature Added**: New functionality implemented
- ✅ **Feature Removed**: Functionality deprecated or deleted
- ✅ **Feature Modified**: Existing feature behavior changed
- ✅ **Feature Renamed**: Feature name or identifier changed

### API Changes

- ✅ **New Endpoint Added**: New API route created
- ✅ **Endpoint Modified**: Existing endpoint behavior changed
- ✅ **Endpoint Removed**: API route deprecated or deleted
- ✅ **Request/Response Format Changed**: API contract modified
- ✅ **Authentication Changed**: Auth requirements modified

### Database Changes

- ✅ **Schema Migration**: Database schema changed (IndexedDB or PostgreSQL)
- ✅ **New Table/Store**: New database table or object store added
- ✅ **Table/Store Removed**: Database table or object store deleted
- ✅ **Field Added**: New column/field added to existing table/store
- ✅ **Field Removed**: Column/field removed from table/store
- ✅ **Field Type Changed**: Data type of field modified
- ✅ **Index Added/Removed**: Database index created or deleted

### Code Structure Changes

- ✅ **New Module/File Created**: New JavaScript module added
- ✅ **Module/File Deleted**: File removed from codebase
- ✅ **Module Renamed**: File or module name changed
- ✅ **Function Added**: New function exported
- ✅ **Function Removed**: Function deleted or no longer exported
- ✅ **Function Signature Changed**: Parameters or return type modified
- ✅ **Dependency Added**: New npm package or CDN library added
- ✅ **Dependency Removed**: Package or library removed
- ✅ **Dependency Updated**: Package version changed significantly

### Configuration Changes

- ✅ **Environment Variable Added**: New env var required
- ✅ **Environment Variable Removed**: Env var no longer used
- ✅ **Config File Modified**: Configuration structure changed
- ✅ **Build Process Changed**: Build script or procedure modified
- ✅ **Deployment Process Changed**: Deployment configuration modified

### UI/UX Changes

- ✅ **New View Added**: New page or view component created
- ✅ **View Removed**: Page or view deleted
- ✅ **Route Added**: New URL route/hash added
- ✅ **Route Removed**: URL route/hash removed
- ✅ **UI Component Added**: New reusable component created

### Architecture Changes

- ✅ **Pattern Introduced**: New architectural pattern adopted
- ✅ **Pattern Removed**: Architectural pattern deprecated
- ✅ **Directory Structure Changed**: File organization modified
- ✅ **Build System Changed**: Build tools or process modified

---

## Update Procedures by Volume

### Volume 1: General Project Overview

**File**: `docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_1.md`

#### COMMAND: Update Section 1.1 (Purpose & Scope)
**TRIGGER**: New feature added, feature removed, or core functionality changed

**STEPS**:
1. Read current Section 1.1 in Volume 1
2. Analyze code changes to identify:
   - New features added to "Core Functionality" list
   - Features removed from list
   - Feature descriptions that need updating
3. Update "Core Functionality (As Implemented)" section:
   - Add new feature with description
   - Remove deleted features
   - Update modified feature descriptions
4. Update "Solved Problems" section if applicable
5. Verify all listed features exist in codebase

**VALIDATION**:
- All features in list have corresponding code
- No orphaned feature descriptions
- Feature descriptions match actual implementation

---

#### COMMAND: Update Section 1.2 (Project Status)
**TRIGGER**: Version number changed, deployment URL changed, test coverage changed

**STEPS**:
1. Check `package.json` for version number
2. Update version in Section 1.2
3. Verify deployment URLs (frontend and backend)
4. Run test suite and update test statistics:
   - Total test count
   - Pass rate
   - Coverage percentages
5. Update "Production Readiness" checklist if status changed

**VALIDATION**:
- Version matches `package.json`
- URLs are accessible
- Test statistics are accurate

---

#### COMMAND: Update Section 1.3 (Technology Stack)
**TRIGGER**: New dependency added, dependency removed, dependency version changed significantly

**STEPS**:
1. Read `package.json` (frontend and backend)
2. Compare with current Section 1.3 listings
3. Update "Frontend Dependencies":
   - Add new packages to appropriate category (production/dev)
   - Remove deleted packages
   - Update version numbers if major version changed
4. Update "Backend Dependencies" similarly
5. Update "CDN Libraries" if new CDN resources added
6. Update "External APIs" if new API integrations added

**VALIDATION**:
- All listed dependencies exist in `package.json`
- No packages in `package.json` missing from documentation
- CDN URLs are correct and accessible

---

#### COMMAND: Update Section 1.4 (File Organization)
**TRIGGER**: New file/directory added, file/directory removed, file renamed

**STEPS**:
1. Scan codebase directory structure
2. Compare with Section 1.4 file list
3. Add new files to appropriate category:
   - Active Core Files
   - Core Modules
   - Database Layer
   - API Clients
   - View Modules
   - Backend
   - Dead Code / Legacy Files
4. Remove deleted files from list
5. Update file paths if files moved/renamed
6. Categorize new files correctly

**VALIDATION**:
- All listed files exist in codebase
- No active files missing from documentation
- Dead code files are correctly marked

---

#### COMMAND: Update Section 1.5 (Design Decisions)
**TRIGGER**: New architectural pattern introduced, pattern removed, design philosophy changed

**STEPS**:
1. Analyze code changes for architectural implications
2. Add new design decisions to list
3. Update existing decisions if patterns changed
4. Remove decisions if patterns deprecated
5. Ensure decisions reflect current codebase state

**VALIDATION**:
- All listed decisions are evident in code
- No contradictory patterns documented

---

### Volume 2: Feature Documentation

**File**: `docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_2.md`

#### COMMAND: Add New Feature Documentation
**TRIGGER**: New feature added to codebase

**STEPS**:
1. Identify feature location in code:
   - View files (`*.view.js` or `views/pages/*.js`)
   - Handler files
   - API files
   - Database files
2. Analyze feature implementation:
   - User flow (step-by-step user actions)
   - Code flow (execution path)
   - Dependencies (imports, modules used)
3. Determine feature category (Section 2.1.X):
   - Paper Management
   - Search & Filtering
   - Collections
   - Notes & Annotations
   - PDF Management
   - Paper Network Graph
   - Citation & Bibliography
   - Data Management
   - Authentication
   - Cloud Sync
   - UI/UX
   - Hidden/Debug Features
4. Add feature documentation following format:
   ```
   ### Feature: [Feature Name]
   **Location**: [file paths]
   
   **User Flow**:
   1. [Step 1]
   2. [Step 2]
   ...
   
   **Code Flow**:
   ```
   [Execution path]
   ```
   
   **Dependencies**:
   - [Module/file dependencies]
   ```
5. Update Section 2.2 (Workflow Logic Summary) if needed

**VALIDATION**:
- User flow matches actual UI behavior
- Code flow accurately represents execution
- All dependencies listed
- Feature appears in correct category

---

#### COMMAND: Update Existing Feature Documentation
**TRIGGER**: Feature behavior modified, user flow changed, code flow changed

**STEPS**:
1. Locate feature in Volume 2, Section 2.1
2. Compare current documentation with code:
   - Read feature implementation files
   - Trace user flow in UI
   - Trace code execution path
3. Update affected sections:
   - User Flow: Update steps that changed
   - Code Flow: Update execution path
   - Dependencies: Add/remove as needed
   - Location: Update if files moved
4. Verify feature still in correct category

**VALIDATION**:
- Updated documentation matches code
- No outdated information remains
- Dependencies are current

---

#### COMMAND: Remove Feature Documentation
**TRIGGER**: Feature removed from codebase

**STEPS**:
1. Locate feature in Volume 2, Section 2.1
2. Remove entire feature section
3. Update Section 2.2 (Workflow Logic Summary) if feature mentioned
4. Check Volume 1, Section 1.1 - remove from feature list if present
5. Check Volume 4 - remove function documentation if applicable

**VALIDATION**:
- No references to removed feature remain
- Feature count updated in summaries

---

#### COMMAND: Update Workflow Logic Summary
**TRIGGER**: Workflow patterns changed, new workflow patterns introduced

**STEPS**:
1. Review Section 2.2
2. Update workflow summaries to reflect current patterns
3. Add new workflow patterns if introduced
4. Remove deprecated patterns

**VALIDATION**:
- Workflows match actual code patterns
- All major workflows documented

---

### Volume 3: Technical Architecture

**File**: `docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_3.md`

#### COMMAND: Update Section 3.1 (Directory Structure)
**TRIGGER**: New directory added, directory removed, directory renamed, file moved

**STEPS**:
1. Scan codebase directory structure
2. Compare with Section 3.1 directory tree
3. Update directory tree:
   - Add new directories with file listings
   - Remove deleted directories
   - Update paths if renamed/moved
4. Ensure all active directories are represented
5. Update file counts if changed

**VALIDATION**:
- Directory tree matches actual structure
- All active directories included
- No orphaned directory references

---

#### COMMAND: Update Section 3.2 (File Inter-dependencies)
**TRIGGER**: New imports added, import paths changed, module dependencies changed

**STEPS**:
1. Analyze import statements in changed files
2. Update dependency diagrams in Section 3.2
3. Update "Entry Point Flow" if `app.js` or `index.html` changed
4. Update "Database Layer Dependencies" if database files changed
5. Update "View Module Dependencies" if view files changed
6. Update "Router Dependencies" if routing changed
7. Update "API Client Dependencies" if API files changed
8. Update "Core Module Dependencies" if core modules changed

**VALIDATION**:
- Dependency chains are accurate
- All imports documented
- No circular dependencies (if applicable)

---

#### COMMAND: Update Section 3.3 (Stack Analysis)
**TRIGGER**: New dependency added, dependency removed, dependency version changed

**STEPS**:
1. Read `package.json` (frontend)
2. Read `backend/package.json` (backend)
3. Update "Frontend Dependencies":
   - Production dependencies list
   - Development dependencies list
4. Update "Backend Dependencies":
   - Production dependencies list
   - Development dependencies list
5. Update "CDN Libraries" if `index.html` changed
6. Update "External APIs" if new API integrations added

**VALIDATION**:
- All dependencies from `package.json` listed
- No extra dependencies documented
- Versions match `package.json`

---

#### COMMAND: Update Section 3.4 (Architecture Patterns)
**TRIGGER**: New pattern introduced, pattern removed, pattern implementation changed

**STEPS**:
1. Analyze code changes for pattern implications
2. Add new patterns to Section 3.4:
   - Pattern name
   - Location
   - Description
   - Benefits
   - Flow diagram
3. Update existing patterns if implementation changed
4. Remove deprecated patterns

**VALIDATION**:
- Patterns are evident in code
- Pattern descriptions are accurate

---

#### COMMAND: Update Section 3.5 (Database Schema)
**TRIGGER**: Database migration, schema change, new table/store, field added/removed

**STEPS**:
1. Check `db/core.js` for IndexedDB schema changes:
   - DB_VERSION number
   - Object store names
   - Index definitions
   - Field structures
2. Check `backend/prisma/schema.prisma` for PostgreSQL changes:
   - Table definitions
   - Field types
   - Relationships
   - Indexes
3. Update "IndexedDB Schema" section:
   - Update database version
   - Add/remove object stores
   - Update field lists
   - Update index lists
4. Update "PostgreSQL Schema" section:
   - Add/remove tables
   - Update field definitions
   - Update relationships

**VALIDATION**:
- Schema matches actual database structure
- All fields documented
- Migration versions match

---

#### COMMAND: Update Section 3.6 (Build System)
**TRIGGER**: Build script changed, build process modified, new build tools added

**STEPS**:
1. Read `build.js` for changes
2. Update "Frontend Build" process description
3. Update "Backend Build" process if applicable
4. Update build output description if changed

**VALIDATION**:
- Build process matches actual scripts
- Output description is accurate

---

#### COMMAND: Update Section 3.7 (Testing Architecture)
**TRIGGER**: Test framework changed, test structure changed, coverage tools changed

**STEPS**:
1. Check `vitest.config.js` for changes
2. Update test framework information
3. Update test structure description
4. Update coverage configuration

**VALIDATION**:
- Test configuration matches actual setup

---

#### COMMAND: Update Section 3.8 (Deployment Architecture)
**TRIGGER**: Deployment platform changed, deployment process modified, URLs changed

**STEPS**:
1. Check deployment configuration files:
   - `backend/railway.json`
   - `backend/render.yaml`
   - `backend/nixpacks.toml`
2. Update deployment platform information
3. Update deployment URLs
4. Update deployment process description

**VALIDATION**:
- URLs are current and accessible
- Deployment process matches configuration

---

### Volume 4: Reference Manual

**File**: `docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_4.md`

**CRITICAL RULE**: "If a function or variable exists in the code, it must exist in this document."

#### COMMAND: Update Section 4.1 (Global Variables & Constants)
**TRIGGER**: New constant added, constant removed, constant value changed

**STEPS**:
1. Scan codebase for exported constants:
   - `export const` statements
   - `export let` statements
   - Configuration objects
2. Compare with Section 4.1 listings
3. Add new constants with:
   - Name
   - Location (file path)
   - Description
   - Value/type
   - Usage
4. Remove deleted constants
5. Update changed constant values
6. Organize by module/file

**VALIDATION**:
- All exported constants documented
- No constants in code missing from documentation
- Values match actual code

---

#### COMMAND: Update Section 4.2 (Database Functions)
**TRIGGER**: New database function added, function removed, function signature changed

**STEPS**:
1. Scan database files:
   - `db/core.js`
   - `db/adapter.js`
   - `db/papers.js`
   - `db/collections.js`
   - `db/annotations.js`
   - `db/data.js`
   - `db/sync.js`
2. For each exported function, document:
   - Function name
   - Location (file path)
   - Parameters (name, type, description)
   - Return type and description
   - Throws (if applicable)
   - Usage notes
3. Update existing function documentation if signature changed
4. Remove deleted functions

**VALIDATION**:
- All exported database functions documented
- Function signatures match code
- Parameters and return types accurate

---

#### COMMAND: Update Section 4.3 (API Client Functions)
**TRIGGER**: New API function added, function removed, function signature changed, API endpoint changed

**STEPS**:
1. Scan API client files in `api/` directory
2. For each exported function, document:
   - Function name
   - Location (file path)
   - Parameters (name, type, description)
   - Return type and description
   - API endpoint called (if applicable)
   - HTTP method
   - Authentication required (yes/no)
3. Update existing function documentation
4. Remove deleted functions
5. Update API endpoint URLs if changed

**VALIDATION**:
- All exported API functions documented
- API endpoints match backend routes
- Function signatures match code

---

#### COMMAND: Update Section 4.4 (UI Helper Functions)
**TRIGGER**: New UI helper added, helper removed, helper signature changed

**STEPS**:
1. Scan `ui.js` and UI-related files
2. Document all exported UI functions:
   - Function name
   - Parameters
   - Return type
   - Description
   - Usage examples
3. Update existing functions
4. Remove deleted functions

**VALIDATION**:
- All UI helpers documented
- Function signatures accurate

---

#### COMMAND: Update Section 4.5 (Core Module Functions)
**TRIGGER**: New core function added, function removed, function signature changed

**STEPS**:
1. Scan core modules in `core/` directory
2. Document all exported functions from each module:
   - `core/state.js`
   - `core/router.js`
   - `core/filters.js`
   - `core/commandPalette.js`
   - `core/keyboardShortcuts.js`
   - `core/syncManager.js`
3. For each function, document:
   - Function name
   - Module location
   - Parameters
   - Return type
   - Description
4. Update existing functions
5. Remove deleted functions

**VALIDATION**:
- All core functions documented
- Function signatures match code

---

#### COMMAND: Update Section 4.6 (Citation Functions)
**TRIGGER**: Citation function added, removed, or modified

**STEPS**:
1. Scan `citation.js`
2. Document all exported citation functions
3. Update function documentation if changed

**VALIDATION**:
- All citation functions documented

---

#### COMMAND: Update Section 4.7 (View Module Functions)
**TRIGGER**: New view added, view removed, view interface changed

**STEPS**:
1. Scan all `*.view.js` files and `views/` directory
2. Document view module interface:
   - Module name
   - File location
   - Exported object structure
   - `mount()` method signature
   - `unmount()` method signature
   - Other exported methods
3. Add new views
4. Remove deleted views
5. Update changed view interfaces

**VALIDATION**:
- All view modules documented
- Interface matches actual code

---

#### COMMAND: Update Section 4.8 (Backend API Endpoints)
**TRIGGER**: New endpoint added, endpoint removed, endpoint modified, route changed

**STEPS**:
1. Scan backend route files in `backend/src/routes/`
2. For each route, document:
   - HTTP method (GET, POST, PUT, DELETE, etc.)
   - Route path
   - Authentication required (yes/no)
   - Request body schema (if applicable)
   - Response schema
   - Error responses
3. Organize by route category:
   - Authentication Routes
   - Papers Routes
   - Collections Routes
   - Annotations Routes
   - Sync Routes
   - User Routes
   - Import Routes
   - Extension Routes
   - Network Routes
4. Add new endpoints
5. Remove deleted endpoints
6. Update modified endpoints

**VALIDATION**:
- All routes documented
- Route paths match actual routes
- Request/response schemas accurate

---

#### COMMAND: Update Section 4.9 (Database Schemas)
**TRIGGER**: Schema migration, field added/removed, type changed

**STEPS**:
1. Check `db/core.js` for IndexedDB schema
2. Check `backend/prisma/schema.prisma` for PostgreSQL schema
3. Update schema documentation:
   - Object store/table definitions
   - Field lists with types
   - Index definitions
   - Relationships
4. Update database version numbers

**VALIDATION**:
- Schema matches actual database
- All fields documented

---

#### COMMAND: Update Section 4.10 (Utility Functions)
**TRIGGER**: New utility added, utility removed, utility signature changed

**STEPS**:
1. Scan utility files:
   - Component utilities
   - Details view managers
   - Dashboard handlers
2. Document all exported utility functions
3. Update existing utilities
4. Remove deleted utilities

**VALIDATION**:
- All utilities documented
- Function signatures accurate

---

### Volume 5: Maintenance & Operations

**File**: `docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_5.md`

#### COMMAND: Update Section 5.1 (Build & Run Procedures)
**TRIGGER**: Build process changed, new build steps added, prerequisites changed

**STEPS**:
1. Review build scripts and processes
2. Update "Prerequisites" if requirements changed
3. Update "Development Setup" steps if process changed
4. Update "Production Build" steps if build changed
5. Update "Testing" section if test process changed
6. Update backend build procedures if changed

**VALIDATION**:
- Build steps are accurate and complete
- Prerequisites are current

---

#### COMMAND: Update Section 5.2 (File Extension Standards)
**TRIGGER**: New file type introduced, file naming convention changed

**STEPS**:
1. Analyze codebase for file type usage
2. Update file extension standards if new types added
3. Update naming conventions if changed
4. Add examples if needed

**VALIDATION**:
- Standards match actual codebase usage

---

#### COMMAND: Update Section 5.3 (Deployment Procedures)
**TRIGGER**: Deployment process changed, new platform added, deployment config changed

**STEPS**:
1. Review deployment configuration files
2. Update deployment steps for each platform
3. Add new platforms if applicable
4. Update environment variable lists
5. Update deployment URLs

**VALIDATION**:
- Deployment steps are accurate
- URLs are current

---

#### COMMAND: Update Section 5.4 (Development Workflow)
**TRIGGER**: Development process changed, new tools added, workflow modified

**STEPS**:
1. Review development practices
2. Update workflow descriptions
3. Add new tools or processes
4. Update code organization guidelines

**VALIDATION**:
- Workflow matches actual practices

---

#### COMMAND: Update Section 5.5 (Troubleshooting)
**TRIGGER**: New common issues discovered, solutions updated

**STEPS**:
1. Add new common issues and solutions
2. Update existing solutions if improved
3. Remove resolved issues if no longer relevant

**VALIDATION**:
- Solutions are accurate and tested

---

#### COMMAND: Update Section 5.6 (Maintenance Tasks)
**TRIGGER**: New maintenance procedures added, procedures updated

**STEPS**:
1. Add new maintenance tasks
2. Update existing task descriptions
3. Update schedules if changed

**VALIDATION**:
- Tasks are actionable and accurate

---

#### COMMAND: Update Section 5.7 (Performance Optimization)
**TRIGGER**: New optimization techniques added, performance improvements made

**STEPS**:
1. Document new optimization techniques
2. Update existing optimizations if changed
3. Add performance metrics if available

**VALIDATION**:
- Optimizations are accurate and effective

---

#### COMMAND: Update Section 5.8 (Security Considerations)
**TRIGGER**: New security measures added, security practices updated

**STEPS**:
1. Document new security measures
2. Update existing security documentation
3. Add new security considerations

**VALIDATION**:
- Security measures are accurately documented

---

#### COMMAND: Update Section 5.9 (File Organization Best Practices)
**TRIGGER**: Organization standards changed, new patterns introduced

**STEPS**:
1. Update file organization guidelines
2. Add new patterns if introduced
3. Update naming conventions

**VALIDATION**:
- Guidelines match actual codebase structure

---

#### COMMAND: Update Section 5.10 (Version Control)
**TRIGGER**: Git workflow changed, branching strategy modified

**STEPS**:
1. Update Git workflow description
2. Update branch strategy if changed
3. Update commit message guidelines if changed

**VALIDATION**:
- Workflow matches actual practices

---

## Command Format Specification

### Standard Command Structure

All update commands follow this structure:

```
COMMAND: [Action] [Target Section]
TRIGGER: [When to execute - specific conditions]
STEPS:
  1. [Detailed step 1]
  2. [Detailed step 2]
  3. [Detailed step 3]
  ...
VALIDATION:
  - [Check 1]
  - [Check 2]
  - [Check 3]
EXAMPLE: [Optional code example or reference]
```

### Command Categories

Commands are organized by:
1. **Volume** (1-5)
2. **Section** within volume
3. **Change Type** (add, update, remove)

### Execution Order

When multiple volumes need updating:
1. **Volume 1** (Overview) - Update first for context
2. **Volume 2** (Features) - Update feature documentation
3. **Volume 3** (Architecture) - Update technical details
4. **Volume 4** (Reference) - Update function/API references
5. **Volume 5** (Operations) - Update procedures last

---

## Validation Procedures

### Automated Validation Checks

#### Check 1: Function Coverage
**COMMAND**: Verify all exported functions are documented

**STEPS**:
1. Scan all `.js` files for `export function` and `export const` statements
2. Extract function names and locations
3. Compare with Volume 4 documentation
4. Report missing functions
5. Report documented functions that no longer exist

**TOOL**: Can be automated with script:
```bash
# Extract all exports
grep -r "export \(function\|const\|class\|async function\)" --include="*.js" . > exports.txt
# Compare with Volume 4
```

---

#### Check 2: API Endpoint Coverage
**COMMAND**: Verify all API endpoints are documented

**STEPS**:
1. Scan `backend/src/routes/*.js` for route definitions
2. Extract all `router.get/post/put/delete` calls
3. Compare with Volume 4, Section 4.8
4. Report missing endpoints
5. Report documented endpoints that no longer exist

**VALIDATION**:
- All routes in code are documented
- All documented routes exist in code

---

#### Check 3: Feature Coverage
**COMMAND**: Verify all features are documented

**STEPS**:
1. Analyze UI files for user-facing features
2. Compare with Volume 2, Section 2.1
3. Check Volume 1, Section 1.1 for feature list consistency
4. Report missing features
5. Report documented features with no code

**VALIDATION**:
- All user-facing features documented
- Feature lists consistent across volumes

---

#### Check 4: Schema Accuracy
**COMMAND**: Verify database schemas match code

**STEPS**:
1. Read `db/core.js` for IndexedDB schema
2. Read `backend/prisma/schema.prisma` for PostgreSQL schema
3. Compare with Volume 3, Section 3.5 and Volume 4, Section 4.9
4. Verify:
   - Object store/table names match
   - Field names and types match
   - Indexes match
   - Relationships match

**VALIDATION**:
- Schema documentation matches actual schema files

---

#### Check 5: Dependency Accuracy
**COMMAND**: Verify dependency lists are accurate

**STEPS**:
1. Read `package.json` files
2. Compare with Volume 1, Section 1.3 and Volume 3, Section 3.3
3. Verify:
   - All dependencies listed
   - Versions match
   - Categories correct (production vs dev)

**VALIDATION**:
- All dependencies from `package.json` documented
- Versions accurate

---

#### Check 6: Link Validation
**COMMAND**: Verify all internal links work

**STEPS**:
1. Extract all markdown links from documentation files
2. Verify target files exist
3. Verify anchor links (if used) exist in target files
4. Report broken links

**VALIDATION**:
- All links are valid
- No broken references

---

#### Check 7: Code Example Validation
**COMMAND**: Verify code examples are accurate

**STEPS**:
1. Extract code examples from documentation
2. Verify examples match actual code
3. Check for syntax errors
4. Verify imports are correct

**VALIDATION**:
- Code examples are syntactically correct
- Examples match actual implementation

---

### Manual Validation Checklist

After automated checks, perform manual validation:

- [ ] Read through updated sections for clarity
- [ ] Verify technical accuracy
- [ ] Check for typos and grammar
- [ ] Ensure consistent formatting
- [ ] Verify cross-references work
- [ ] Check that "Last Updated" dates are current
- [ ] Ensure examples are relevant and helpful

---

## Examples & Use Cases

### Example 1: Adding a New Feature

**Scenario**: New "Export to CSV" feature added

**TRIGGERS**:
- New feature added
- New function exported
- New API endpoint (if backend involved)

**EXECUTION**:

1. **Update Volume 1, Section 1.1**:
   - Add "Export to CSV" to Core Functionality list
   - Add description: "Export paper data to CSV format"

2. **Update Volume 2, Section 2.1**:
   - Add new feature section under "Data Management Features":
     ```
     ### Feature: Export to CSV
     **Location**: `settings.view.js`, `db/data.js`
     
     **User Flow**:
     1. User navigates to Settings → Data Management
     2. User clicks "Export to CSV"
     3. CSV file generated and downloaded
     
     **Code Flow**:
     [Execution path]
     
     **Dependencies**:
     - `db/data.js` (getAllPapers)
     - `ui.js` (showToast)
     ```

3. **Update Volume 4, Section 4.2**:
   - Add new function to Database Functions:
     ```
     **`exportToCSV()`** - Exports papers to CSV format
     - Location: `db/data.js`
     - Returns: `Promise<Blob>` (CSV file)
     ```

4. **Update Volume 4, Section 4.8** (if backend endpoint):
   - Add new endpoint to appropriate route section

5. **Run Validation**:
   - Verify function exists in code
   - Verify feature works as documented
   - Check all cross-references

---

### Example 2: Modifying an API Endpoint

**Scenario**: `GET /api/papers` now supports pagination query parameters

**TRIGGERS**:
- API endpoint modified
- Request/response format changed

**EXECUTION**:

1. **Update Volume 2, Section 2.1** (if feature affected):
   - Update "Get All Papers" feature documentation
   - Add pagination parameters to user flow

2. **Update Volume 4, Section 4.3**:
   - Update `getAllPapers()` function documentation:
     - Add `options` parameter description
     - Document pagination parameters
     - Update return type if changed

3. **Update Volume 4, Section 4.8**:
   - Update `GET /api/papers` endpoint documentation:
     - Add query parameters: `?page=1&limit=25`
     - Update request/response schema
     - Add pagination metadata to response

4. **Run Validation**:
   - Verify endpoint accepts new parameters
   - Test pagination functionality
   - Check response format matches documentation

---

### Example 3: Database Schema Migration

**Scenario**: New field `favorite` (Boolean) added to papers table

**TRIGGERS**:
- Database schema changed
- Field added
- Migration created

**EXECUTION**:

1. **Update Volume 3, Section 3.5**:
   - Update IndexedDB schema:
     - Add `favorite` field to papers object store
     - Update database version if incremented
   - Update PostgreSQL schema:
     - Add `favorite Boolean` field to Paper model

2. **Update Volume 4, Section 4.9**:
   - Add `favorite` field to papers schema documentation
   - Update field lists

3. **Update Volume 2, Section 2.1** (if UI feature added):
   - Add "Mark as Favorite" feature if UI implemented
   - Update paper data structure in relevant features

4. **Update Volume 4, Section 4.2** (if functions affected):
   - Update `addPaper()`, `updatePaper()` function docs
   - Add `favorite` parameter documentation

5. **Run Validation**:
   - Verify migration file exists
   - Check schema matches Prisma schema
   - Verify field accessible in code

---

### Example 4: Adding a New Dependency

**Scenario**: New library `date-fns` added for date formatting

**TRIGGERS**:
- Dependency added
- Stack changed

**EXECUTION**:

1. **Update Volume 1, Section 1.3**:
   - Add `date-fns` to Frontend Dependencies (production)
   - Add version number

2. **Update Volume 3, Section 3.3**:
   - Add `date-fns` to Frontend Dependencies list
   - Update package.json reference

3. **Update Volume 4, Section 4.4** (if used in UI helpers):
   - Update `formatRelativeTime()` if now uses date-fns
   - Document date-fns usage

4. **Update Volume 5, Section 5.1** (if affects build):
   - Update build process if needed

5. **Run Validation**:
   - Verify `date-fns` in `package.json`
   - Check imports use correct package name
   - Verify functionality works

---

## Quick Reference Cheat Sheet

### Common Update Scenarios

#### New Feature Added
1. Volume 1, Section 1.1 → Add to feature list
2. Volume 2, Section 2.1 → Add feature documentation
3. Volume 4, Section 4.2/4.3/4.4 → Add function documentation
4. Volume 4, Section 4.8 → Add API endpoint (if applicable)
5. Validate all changes

#### API Endpoint Modified
1. Volume 2, Section 2.1 → Update feature documentation (if UI affected)
2. Volume 4, Section 4.3 → Update API function
3. Volume 4, Section 4.8 → Update endpoint documentation
4. Validate endpoint works as documented

#### Database Schema Changed
1. Volume 3, Section 3.5 → Update schema documentation
2. Volume 4, Section 4.9 → Update schema reference
3. Volume 2, Section 2.1 → Update feature docs (if UI affected)
4. Volume 4, Section 4.2 → Update database functions
5. Validate schema matches code

#### New File/Module Added
1. Volume 1, Section 1.4 → Add to file organization
2. Volume 3, Section 3.1 → Add to directory structure
3. Volume 3, Section 3.2 → Update dependencies
4. Volume 4 → Add function documentation (if exports)
5. Validate file exists and is documented

#### Dependency Added/Removed
1. Volume 1, Section 1.3 → Update stack
2. Volume 3, Section 3.3 → Update dependencies
3. Volume 5, Section 5.1 → Update build (if needed)
4. Validate in package.json

#### Function Signature Changed
1. Volume 4, Section 4.X → Update function documentation
2. Volume 2, Section 2.1 → Update code flow (if affected)
3. Validate signature matches code

#### Route/View Added
1. Volume 2, Section 2.1 → Add feature documentation
2. Volume 3, Section 3.1 → Add to directory structure
3. Volume 4, Section 4.7 → Add view module
4. Volume 4, Section 4.5 → Update router (if core/router.js changed)
5. Validate route works

### Update Priority Order

When multiple updates needed, prioritize:

1. **Critical**: Schema changes, breaking API changes
2. **High**: New features, removed features
3. **Medium**: Function signature changes, new dependencies
4. **Low**: Documentation improvements, formatting

### Validation Checklist

After any update, verify:

- [ ] All affected volumes updated
- [ ] Function signatures match code
- [ ] API endpoints match backend
- [ ] Schema matches database
- [ ] Dependencies match package.json
- [ ] Examples are accurate
- [ ] Cross-references work
- [ ] "Last Updated" dates current
- [ ] No broken links
- [ ] Formatting consistent

---

## Maintenance Notes

### Documentation Update Workflow

1. **Code Change Made** → Identify triggers
2. **Execute Update Commands** → Follow procedures for affected volumes
3. **Run Validation** → Automated and manual checks
4. **Update Metadata** → "Last Updated" dates
5. **Commit Changes** → Include documentation updates in same commit

### Best Practices

- Update documentation **immediately** with code changes
- Don't defer documentation updates
- Validate all changes before committing
- Keep "Last Updated" dates accurate
- Maintain consistent formatting
- Use clear, concise language
- Include code examples where helpful

### Common Mistakes to Avoid

- ❌ Documenting planned features as if implemented
- ❌ Leaving outdated information
- ❌ Missing function parameters or return types
- ❌ Incorrect API endpoint paths
- ❌ Outdated dependency versions
- ❌ Broken cross-references
- ❌ Inconsistent formatting

---

**End of Documentation Update Commands**

**Last Updated**: 2025-01-XX  
**Version**: 1.0


