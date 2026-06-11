import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update swipeQueue
old_swipe_queue = """                    const swipeQueue = studentMatchedAnnouncements.filter(
                      ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                    );"""

new_swipe_queue = """                    const baseSwipeQueue = studentMatchedAnnouncements.filter(
                      ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                    );
                    const swipeQueue = [...baseSwipeQueue];
                    const adIndices = [5, 11, 18];
                    let insertedAds = 0;
                    adIndices.forEach((targetIndex) => {
                      const insertPos = targetIndex + insertedAds;
                      if (swipeQueue.length > 0) {
                        swipeQueue.splice(insertPos, 0, {
                          id: `adfit-native-${insertedAds}`,
                          title: 'AD',
                          host: 'Kakao AdFit',
                          category: 'AD',
                          deadline: new Date().toISOString(),
                          location: '전국',
                          details: '광고',
                          image_url: '',
                          apply_url: '',
                        });
                        insertedAds++;
                      }
                    });"""
text = text.replace(old_swipe_queue, new_swipe_queue)

# 2. Update rendering of swipe-card
old_card_start = """                            <div className={`swipe-card ${isNeonThemeUnlocked ? 'theme-neon-pink' : ''}`}>
                              {/* 좌우 드래그 상태 반투명 가이드 뱃지 */}"""

new_card_start = """                            <div className={`swipe-card ${isNeonThemeUnlocked ? 'theme-neon-pink' : ''}`} style={ann.category === 'AD' ? { padding: 0, border: 'none', background: 'transparent' } : undefined}>
                              {ann.category === 'AD' ? (
                                <AdFitNativeCard unit="DAN-qR5fN9hG" height="100%" />
                              ) : (
                                <>
                              {/* 좌우 드래그 상태 반투명 가이드 뱃지 */}"""

old_card_end = """                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });"""

new_card_end = """                                  </div>
                                </div>
                              </div>
                              </>
                              )}
                            </div>
                          </div>
                        );
                      });"""

text = text.replace(old_card_start, new_card_start)
text = text.replace(old_card_end, new_card_end)

# 3. Add AdFitBanner100 to List view
# It renders announcements in `listQueue.map((ann, idx)`
old_list_queue = """                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
                    {listQueue.map((ann, idx) => {"""

new_list_queue = """                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
                    {listQueue.map((ann, idx) => {
                      const showAd = idx === 5 || idx === 11 || idx === 18;"""

old_list_return = """                      return (
                        <div
                          key={`list-card-${ann.id}`}"""

new_list_return = """                      return (
                        <React.Fragment key={`list-card-wrap-${ann.id}`}>
                        {showAd && <AdFitBanner100 unit="DAN-qR5fN9hG" />}
                        <div
                          key={`list-card-${ann.id}`}"""

old_list_end = """                        </div>
                      );
                    })}
                  </div>"""

new_list_end = """                        </div>
                        </React.Fragment>
                      );
                    })}
                  </div>"""

text = text.replace(old_list_queue, new_list_queue)
text = text.replace(old_list_return, new_list_return)
text = text.replace(old_list_end, new_list_end)

# 4. Add AdFitFixedBanner50 at the bottom
old_bottom = """      {/* Navigation Bar (Toss Style) */}"""
new_bottom = """      <AdFitFixedBanner50 unit="DAN-qR5fN9hG" style={{ position: 'fixed', bottom: '65px', zIndex: 9999 }} />
      {/* Navigation Bar (Toss Style) */}"""
text = text.replace(old_bottom, new_bottom)

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Ads injected successfully!')
