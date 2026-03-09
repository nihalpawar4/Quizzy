#!/usr/bin/env python3
"""Clean up credit economy code from teacher dashboard - v3."""

with open('src/app/dashboard/teacher/page.tsx', 'r') as f:
    content = f.read()
    lines = content.split('\n')

total = len(lines)
print(f"Original file: {total} lines")
remove = set()

# === IMPORTS ===
credit_icons = {'Coins,', 'Gift,', 'Award,', 'Star,', 'Sparkles,', 'ToggleLeft,', 'ToggleRight,'}
for i, line in enumerate(lines):
    if line.strip() in credit_icons:
        remove.add(i)

# creditServices import block
for i, line in enumerate(lines):
    if "from '@/lib/creditServices'" in line:
        j = i
        while j > 0 and 'import' not in lines[j]:
            j -= 1
        for k in range(j, i + 1):
            remove.add(k)
        break

# Clean credit types
for i, line in enumerate(lines):
    if 'import type' in line and 'CreditWallet' in line:
        for t in ['CreditWallet, ', 'PremiumTest, ', 'CreditTransaction, ', 'BadgeType, ',
                   ', CreditWallet', ', PremiumTest', ', CreditTransaction', ', BadgeType']:
            lines[i] = lines[i].replace(t, '')
        break

# === activeTab TYPE ===
for i, line in enumerate(lines):
    if "useState<'tests' | 'analytics' | 'notes' | 'credits'>" in line:
        lines[i] = line.replace(" | 'credits'", "")
        break

# === newTest & resetCreateForm credit fields ===
credit_field_strs = ['coinCost: number;', 'isPremium: boolean;', 'isMandatory: boolean;',
                     'coinCost: 0,', 'isPremium: false,', 'isMandatory: false',
                     '// Credit economy fields',
                     'coinCost: newTest.coinCost,', 'isPremium: newTest.isPremium,',
                     'isMandatory: newTest.isMandatory,']
for i, line in enumerate(lines):
    if line.strip() in credit_field_strs:
        remove.add(i)

# === STATE VARIABLES ===
credit_states = [
    'wallets, setWallets', 'premiumTests, setPremiumTests', 'recentTransactions, setRecentTransactions',
    'creditDataLoading, setCreditDataLoading', 'showBonusModal, setShowBonusModal',
    'selectedStudentForBonus, setSelectedStudentForBonus', 'bonusAmount, setBonusAmount',
    'bonusReason, setBonusReason', 'isSendingBonus, setIsSendingBonus',
    'showBadgeModal, setShowBadgeModal', 'selectedStudentForBadge, setSelectedStudentForBadge',
    'selectedBadgeType, setSelectedBadgeType', 'customBadgeName, setCustomBadgeName',
    'customBadgeIcon, setCustomBadgeIcon', 'badgeReason, setBadgeReason',
    'isAwardingBadge, setIsAwardingBadge', 'showPremiumTestModal, setShowPremiumTestModal',
    'isCreatingPremiumTest, setIsCreatingPremiumTest', 'premiumTestJson, setPremiumTestJson',
    'premiumParsedQuestions, setPremiumParsedQuestions', 'premiumParseError, setPremiumParseError',
    'premiumCreateStep, setPremiumCreateStep', 'creditEconomyEnabled, setCreditEconomyEnabled',
    'isTogglingCredit, setIsTogglingCredit', 'isDeletingTransactions, setIsDeletingTransactions',
    'showDeleteTransactionsConfirm, setShowDeleteTransactionsConfirm',
    'creditStats, setCreditStats', 'deletingWalletId, setDeletingWalletId',
]
for i, line in enumerate(lines):
    if i > 400: break
    for pat in credit_states:
        if pat in line:
            remove.add(i)
            break

# Multi-line newPremiumTest state 
for i, line in enumerate(lines):
    if 'newPremiumTest, setNewPremiumTest' in line:
        j = i
        brace = 0
        while j < total:
            brace += lines[j].count('{') - lines[j].count('}')
            if brace <= 0 and j > i: break
            j += 1
        for k in range(i, j + 1): remove.add(k)
        break

# Comment lines
for cmt in ['// Credit economy state', '// Bonus coins modal', '// Award badge modal',
            '// Premium test creation modal', '// Credit economy toggle', '// Credit stats']:
    for i, line in enumerate(lines):
        if i > 400: break
        if line.strip() == cmt: remove.add(i)

# === FUNCTIONS ===
# These all reside in lines 377-702 range. Let me just find the precise range.
func_sigs = [
    'const loadCreditData = useCallback',
    'const handleToggleCreditEconomy = async',
    'const handleDeleteAllTransactions = async',
    'const handleCleanupDuplicates = async',
    'const handleDeleteWallet = async',
    'const handleGrantBonus = async',
    'const handleAwardBadge = async',
    'const handleParsePremiumJson',
    'const resetPremiumTestForm',
    'const handleCreatePremiumTest = async',
    'const handleDeletePremiumTest = async',
]
for sig in func_sigs:
    for i, line in enumerate(lines):
        if sig in line:
            j = i
            brace = 0; started = False
            while j < total:
                brace += lines[j].count('{') - lines[j].count('}')
                if brace > 0: started = True
                if started and brace == 0: break
                j += 1
            # For useCallback, also grab the dependency array
            if 'useCallback' in lines[i]:
                while j < total - 1:
                    j += 1
                    if ']);' in lines[j]: break
            for k in range(i, j + 1): remove.add(k)
            print(f"  Func {sig.split('=')[0].strip()}: {i+1}-{j+1}")
            break

# === useEffect cleanup ===
for i, line in enumerate(lines):
    if 'loadCreditData(); // Load credit economy data' in line:
        remove.add(i)
for i, line in enumerate(lines):
    if 'getAppSettings().then' in line:
        j = i
        while j < total:
            if '});' in lines[j]:
                for k in range(i, j + 1): remove.add(k)
                break
            j += 1
        break
for i, line in enumerate(lines):
    if 'loadCreditData]' in line:
        lines[i] = line.replace(', loadCreditData]', ']')

# App settings listener
for i, line in enumerate(lines):
    if '// Real-time listener for app settings' in line:
        j = i
        while j < total:
            if '}, []);' in lines[j]:
                for k in range(i, j + 1): remove.add(k)
                print(f"  App settings listener: {i+1}-{j+1}")
                break
            j += 1
        break

# Premium tests listener
for i, line in enumerate(lines):
    if '// Real-time listener for premium tests' in line:
        j = i
        while j < total:
            if '}, [user]);' in lines[j]:
                for k in range(i, j + 1): remove.add(k)
                print(f"  Premium tests listener: {i+1}-{j+1}")
                break
            j += 1
        break

# loadCreditData(); // Refresh data (in handleGrantBonus etc.)
for i, line in enumerate(lines):
    if 'loadCreditData();' in line and i not in remove:
        remove.add(i)

# === UI - Toggle buttons ===
toggle_positions = []
for i, line in enumerate(lines):
    if '{/* Credit Economy Toggle */}' in line:
        toggle_positions.append(i)

for pos in toggle_positions:
    i = pos
    j = i + 1
    while j < total:
        if '</button>' in lines[j]:
            for k in range(i, j + 1): remove.add(k)
            print(f"  Toggle button: {i+1}-{j+1}")
            break
        j += 1

# === UI - Tab entry ===
for i, line in enumerate(lines):
    if 'creditEconomyEnabled' in line and "'credits'" in line and "'Credit Economy'" in line:
        remove.add(i)
        break

# Tab styling
for i, line in enumerate(lines):
    if "tab.id === 'credits'" in line:
        remove.add(i)
        if i + 1 < total and 'amber' in lines[i + 1]:
            remove.add(i + 1)
            if i + 2 < total and ": 'bg-white" in lines[i + 2]:
                lines[i + 2] = lines[i + 2].replace(": 'bg-white", "? 'bg-white")
        break

# Tab wallet badge count
for i, line in enumerate(lines):
    if "tab.id === 'credits'" in line and 'wallets' in line:
        # Find the closing paren/bracket of this conditional render
        j = i
        depth = 0
        while j < total:
            depth += lines[j].count('(') - lines[j].count(')')
            if depth <= 0 and j > i: break
            j += 1
        for k in range(i, j + 1): remove.add(k)
        print(f"  Tab wallet badge: {i+1}-{j+1}")
        break

# Students stat card fix
for i, line in enumerate(lines):
    if "setActiveTab('credits')" in line and 'setShowStudentsModal' in line:
        lines[i] = line.replace("setActiveTab('credits'); ", "")
        break
for i, line in enumerate(lines):
    if "activeTab === 'credits'" in line and 'border-green-500' in line:
        lines[i] = line.replace(
            "${activeTab === 'credits' ? 'border-green-500 dark:border-green-400 ring-2 ring-green-500/20' : 'border-gray-200 dark:border-gray-800'}",
            "border-gray-200 dark:border-gray-800"
        )
        break

# Premium test creation in handleCreateTest
for i, line in enumerate(lines):
    if '// If this is a premium test' in line:
        j = i + 1
        while j < total and 'if (newTest.isPremium)' not in lines[j]: j += 1
        brace = 0; started = False
        while j < total:
            brace += lines[j].count('{') - lines[j].count('}')
            if brace > 0: started = True
            if started and brace == 0:
                for k in range(i, j + 1): remove.add(k)
                print(f"  Premium in createTest: {i+1}-{j+1}")
                break
            j += 1
        break

# === Credit Economy Tab (lines ~2142-2478) ===
for i, line in enumerate(lines):
    if '{/* Credit Economy Tab */}' in line:
        j = i + 1
        while j < total and "activeTab === 'credits'" not in lines[j]: j += 1
        paren = 0; started = False
        while j < total:
            paren += lines[j].count('(') - lines[j].count(')')
            if paren > 0: started = True
            if started and paren == 0:
                for k in range(i, j + 1): remove.add(k)
                print(f"  Credit Economy Tab: {i+1}-{j+1}")
                break
            j += 1
        break

# === Coin display in test cards ===
for i, line in enumerate(lines):
    if 'test.isMandatory' in line and 'coinCost' in line and i not in remove:
        s = i
        while s > 0 and '<span' not in lines[s]: s -= 1
        e = i
        while e < total and '</span>' not in lines[e]: e += 1
        for k in range(s, e + 1): remove.add(k)
        print(f"  Coin display: {s+1}-{e+1}")

# === Credit Modals at bottom of file ===
# These modals follow a pattern:
#   {/* Modal Name */}
#   <AnimatePresence>
#       {condition && (
#           ...
#       )}
#   </AnimatePresence>
credit_modal_comments = [
    'Grant Bonus Coins Modal',
    'Award Badge Modal',
    'Create Premium Test Modal',
    'Delete All Transactions Confirmation Modal',
]
for marker in credit_modal_comments:
    for i, line in enumerate(lines):
        if marker in line and '{/*' in line and i not in remove:
            # The AnimatePresence is on the NEXT line
            start = i
            j = i + 1
            if '<AnimatePresence>' in lines[j]:
                # Find the closing </AnimatePresence>
                end = j + 1
                while end < total:
                    if '</AnimatePresence>' in lines[end]:
                        for k in range(start, end + 1): remove.add(k)
                        print(f"  Modal '{marker}': {start+1}-{end+1}")
                        break
                    end += 1
            break

# === isPremium badge/indicator in test cards ===
for i, line in enumerate(lines):
    if 'test.isPremium' in line and i not in remove:
        # Find the containing conditional block
        if '{test.isPremium && (' in line or 'test.isPremium &&' in line:
            j = i
            depth = 0
            while j < total:
                depth += lines[j].count('(') - lines[j].count(')')
                if depth <= 0 and j > i: break
                j += 1
            for k in range(i, j + 1): remove.add(k)
            print(f"  isPremium indicator: {i+1}-{j+1}")

# === Premium/coins field UI in create test modal ===
# These are inputs for coinCost, isPremium toggle, isMandatory toggle
for i, line in enumerate(lines):
    if ('newTest.isPremium' in line or 'newTest.coinCost' in line or 'newTest.isMandatory' in line) and i not in remove:
        # Find the enclosing div or block
        pass  # These will be in a section we need to find

# Find "Premium Test Settings" section in create test modal
for i, line in enumerate(lines):
    if 'Premium Test Settings' in line and i not in remove:
        # Find the containing div
        s = i - 1
        while s > 0 and '<div' not in lines[s].strip()[:4]:
            s -= 1
        # Find matching close
        j = i
        div_depth = 0
        while j < total:
            div_depth += lines[j].count('<div') - lines[j].count('</div>')
            if div_depth <= 0 and j > i: break
            j += 1
        for k in range(s, j + 1): remove.add(k)
        print(f"  Premium Test Settings UI: {s+1}-{j+1}")
        break

# === BUILD NEW FILE ===
new_lines = []
prev_blank = False
for i, line in enumerate(lines):
    if i in remove: continue
    is_blank = line.strip() == ''
    if is_blank and prev_blank: continue
    new_lines.append(line)
    prev_blank = is_blank

print(f"\nNew file: {len(new_lines)} lines (removed {total - len(new_lines)})")
with open('src/app/dashboard/teacher/page.tsx', 'w') as f:
    f.write('\n'.join(new_lines))
print("Done!")
