import re

with open('src/components/MainFeed.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Share error fix
# Replace `} catch (err: any) { \n if (err.name === 'AbortError') return;` 
# with `} catch (err: any) { \n if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('cancel'))) return;`
text = text.replace("if (err.name === 'AbortError') return;", "if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('cancel'))) return;")

# 2. Contacts error try-catch
# `const permission = await Contacts.requestPermissions();` -> wrap the whole thing if it's not wrapped? Actually it's already wrapped in `try { ... } catch (err) { showAlert(err) }`. We can just silence the alert or ignore.
text = re.sub(r'(await showAlert\(`연락처를 불러오는데 실패했습니다: \$\{.*?\}\`\);)', r'console.warn("Contacts error:", err); // \1', text)

# 3. Play_style tags flex-wrap and size
# `gap: '6px', flexWrap: 'wrap', maxWidth: '85%'` -> already wrap. But maybe the text is too big.
# I'll reduce padding and font size for tags from `11px` to `10px` and `padding: '3px 8px'`.
text = text.replace("fontSize: '11px', fontWeight: 600, color: '#3182F6', backgroundColor: '#FFFFFF', padding: '4px 10px'", "fontSize: '10px', fontWeight: 600, color: '#3182F6', backgroundColor: '#FFFFFF', padding: '3px 8px'")
text = text.replace("fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '4px 10px'", "fontSize: '10px', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px'")
text = text.replace("fontSize: '11px', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '4px 10px'", "fontSize: '10px', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px'")
text = text.replace("fontSize: '11px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '4px 10px'", "fontSize: '10px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '3px 8px'")
text = text.replace("maxWidth: '85%'", "maxWidth: '100%', maxHeight: '60px', overflowY: 'auto', paddingRight: '4px'")

with open('src/components/MainFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("MainFeed updated")
