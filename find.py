import tokenize
with open('apps/api/src/services/referrals/payouts.py', 'rb') as f:
    try:
        for tok in tokenize.tokenize(f.readline):
            if tok.type == tokenize.STRING and '"""' in tok.string:
                print(tok.start[0], tok.end[0])
    except Exception as e:
        print(e)
