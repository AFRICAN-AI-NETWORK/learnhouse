import json
import sys

try:
    filename = sys.argv[1] if len(sys.argv) > 1 else 'lint_report.json'
    sys.stdout.reconfigure(encoding='utf-8')
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)

rule_counts = {}
total_errors = 0
total_warnings = 0

for file_result in data:
    for message in file_result.get('messages', []):
        rule_id = message.get('ruleId') or 'unknown'
        severity = message.get('severity')
        
        if rule_id not in rule_counts:
            rule_counts[rule_id] = {'errors': 0, 'warnings': 0}
            
        if severity == 2:
            rule_counts[rule_id]['errors'] += 1
            total_errors += 1
        else:
            rule_counts[rule_id]['warnings'] += 1
            total_warnings += 1

with open('lint_fix_output.txt', 'w', encoding='utf-8') as outfile:
    outfile.write(f"Total Errors: {total_errors}\n")
    outfile.write(f"Total Warnings: {total_warnings}\n")
    outfile.write("\nRule Breakdown:\n")
    for rule_id, counts in sorted(rule_counts.items(), key=lambda x: x[1]['errors'] + x[1]['warnings'], reverse=True):
        outfile.write(f"{rule_id}: {counts['errors']} errors, {counts['warnings']} warnings\n")

    outfile.write("\n--- Details for Batch 3 Rules ---\n")
    target_rules = ['react-hooks/set-state-in-effect', 'react-hooks/static-components', 'react-hooks/preserve-manual-memoization']
    for file_result in data:
        for message in file_result.get('messages', []):
            rule_id = message.get('ruleId')
            if rule_id in target_rules:
                outfile.write(f"[{rule_id}] {file_result['filePath']}:{message['line']}\n")
