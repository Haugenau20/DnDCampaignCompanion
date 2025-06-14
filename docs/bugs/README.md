# Bug Tracking

This directory contains documentation of bugs discovered during testing and development.

## Bug Status Legend

- 🔍 **DISCOVERED** - Bug identified through testing
- 🔄 **IN PROGRESS** - Bug is being investigated or fixed
- ✅ **FIXED** - Bug has been resolved
- 🚫 **WONT FIX** - Bug will not be addressed (with reason)

## Bug Categories

- **CONTEXT** - Issues with React Context providers and hooks
- **CRUD** - Create, Read, Update, Delete operation issues
- **UI** - User interface and component issues  
- **DATA** - Data integrity and consistency issues
- **PERFORMANCE** - Performance and scalability issues
- **INTEGRATION** - Third-party integration issues

## Reporting Guidelines

When documenting a bug:

1. **Clear Title** - Concise description of the issue
2. **Status** - Current status with emoji
3. **Category** - Bug category for organization
4. **Discovery Method** - How the bug was found (test, user report, etc.)
5. **Impact** - User impact level (High, Medium, Low)
6. **Steps to Reproduce** - Exact steps to reproduce the issue
7. **Expected Behavior** - What should happen
8. **Actual Behavior** - What actually happens
9. **Test Case** - Reference to test that reveals the bug

## Current Bugs

| Bug # | Status | Category | Title | Impact | Priority |
|-------|--------|----------|-------|---------|----------|
| [#001](./001-npc-context-mock-state-isolation.md) | ✅ FIXED | CONTEXT | NPCContext Mock State Isolation Issues | High (Testing) | Fixed |
| [#002](./002-npc-id-generation-collision.md) | 🔍 DISCOVERED | DATA | NPC ID Generation Collision Risk | Medium | Medium |
| [#003](./003-react-key-uniqueness-warning.md) | 🔍 DISCOVERED | UI | React Key Uniqueness Warning | Low | Low-Medium |

## Summary

- **Total Bugs**: 3
- **Fixed**: 1 (testing infrastructure)
- **Open**: 2 (need investigation in real codebase)
- **High Priority**: 0
- **Medium Priority**: 1
- **Low Priority**: 1

See individual bug files in this directory for detailed information.