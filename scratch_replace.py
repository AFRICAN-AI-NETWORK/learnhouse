import os
import re

directories = [
    'ai-automation',
    'ai-fundamentals',
    'nodejs-backend',
    'ai-automation-content-creators'
]

base_path = r'c:\Users\hp\Documents\GitHub\learnhouse\apps\web\app\orgs\[orgslug]\(withmenu)'

colors = {
    'ai-automation': 'purple',
    'ai-fundamentals': 'emerald',
    'nodejs-backend': 'indigo',
    'ai-automation-content-creators': 'fuchsia'
}

names = {
    'ai-automation': 'AI Automation for Businesses',
    'ai-fundamentals': 'Applied Data Science',
    'nodejs-backend': 'Node.js Backend',
    'ai-automation-content-creators': 'AI Content Creation'
}

for d in directories:
    file_path = os.path.join(base_path, d, 'page.tsx')
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    theme = colors[d]
    course_name = names[d]

    # We want to replace everything from {/* Right: Price Card */} down to its closing tag.
    # The structure is:
    #             {/* Right: Price Card */}
    #             <div className="w-full lg:w-[320px] flex-shrink-0">
    #               ... lots of stuff ...
    #             </div>
    #           </div>
    #         </div>
    #       </section>

    # A robust way is to find {/* Right: Price Card */} and then find `</section>`

    start_idx = content.find('{/* Right: Price Card */}')
    if start_idx == -1:
        print(f"Failed to find start in {d}")
        continue

    end_idx = content.find('</section>', start_idx)

    # But wait, there are two closing divs before </section>:
    #             </div>
    #           </div>
    #         </div>
    #       </section>

    # Let's find `<ClickToPayButton` and then match the divs after it up to `</section>`.

    part1 = content[:start_idx]
    part2 = content[end_idx:]

    # We need to preserve the `</div>\n          </div>\n        </div>\n` before `</section>`
    # Let's just re-inject it manually to be safe.

    replacement = f'''{{/* Right: Price Card */}}
            <div className="w-full lg:w-[320px] flex-shrink-0">
              <div className="bg-white/[0.06] backdrop-blur-xl border border-{theme}-500/30 rounded-[24px] p-8 space-y-6 relative overflow-hidden shadow-2xl shadow-{theme}-500/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-{theme}-500/20 rounded-full blur-[50px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-{theme}-500/20 text-{theme}-400 text-[11px] font-bold uppercase tracking-wider mb-4 border border-{theme}-500/30">
                    <CheckCircle2 size={{12}} /> AINA Pro
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                    Unlock {course_name} + 6 other premium courses
                  </h3>

                  <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
                    Get full access to the entire AINA curriculum, mentorship, and guaranteed internship placement.
                  </p>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$10</span>
                    <span className="text-gray-400 font-medium">/month</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 mb-8 font-medium">Cancel anytime. No hidden fees.</p>

                  <div className="space-y-3">
                    <ClickToPayButton
                      courseId="aina-pro-subscription"
                      courseName="AINA Pro Subscription"
                      priceAmount={{10}}
                      currency="USD"
                    />
                    <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1 mt-3">
                      <Lock size={{12}} /> Secure Checkout
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      '''

    new_content = part1 + replacement + part2

    if 'Lock,' not in new_content and 'Lock ' not in new_content:
        # Some files use CheckCircle2, some have LayoutTemplate, find an import block and inject Lock
        new_content = re.sub(r'(import \{[^\}]+)(CheckCircle2,)', r'\1\2\n  Lock,', new_content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {d}")
