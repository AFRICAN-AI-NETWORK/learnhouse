import os

def replace_in_file(file_path):
    if not os.path.exists(file_path):
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    content = content.replace('make_paystack_request', 'make_flutterwave_request')
    content = content.replace('mock_paystack', 'mock_flutterwave')
    content = content.replace('fake_paystack', 'fake_flutterwave')
    content = content.replace('paystack_transfer_code', 'flutterwave_transfer_id')
    content = content.replace('paystack_transfer_recipient_code', 'flutterwave_beneficiary_id')
    content = content.replace('paystack_recipient_code', 'flutterwave_beneficiary_id')
    content = content.replace('create_paystack_transfer_recipient', 'create_flutterwave_transfer')
    content = content.replace('initiate_paystack_transfer', 'create_flutterwave_transfer')
    content = content.replace('CURRENCY_TO_PAYSTACK_RECIPIENT_TYPE', 'COUNTRY_TO_CURRENCY')
    
    # Process payout specific fixes
    content = content.replace('TRF_flow1', 'TRF_flow1') # keep transfer ID mock
    content = content.replace('RCP_flow1', 'RCP_flow1')
    content = content.replace('RCP_cached', 'RCP_cached')
    
    # Fix the transferrecipient mock check
    content = content.replace('mock_flutterwave["transferrecipient"] == 1', 'mock_flutterwave["transfers"] == 1')
    content = content.replace('mock_flutterwave["transferrecipient"] == 0', 'mock_flutterwave["transfers"] == 1')
    content = content.replace('mock_flutterwave["transfer"] == 1', 'mock_flutterwave["transfers"] == 1')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('apps/api/src/tests/marketers/test_marketer_payout.py')
replace_in_file('apps/api/src/tests/marketers/test_marketer_payout_flow.py')

print("Tests updated to use flutterwave")
