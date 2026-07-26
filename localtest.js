function tokenizeM(text) {
    const tokens = []; // đầu ra chứa strings
    const regex = /\\\{|\\\}|\{|\}|\\n|\\N/g; // regex ("\{", "\}", "{", "}", hoặc "\N")
    let endIndex = 0; // Con trỏ cho text thường.
    let match; // Kết quả regex.exec(text), 
    // ở đây quan tâm match[0] (kí tự khớp trong regex, "\{", "\}", "{", hoặc "}") 
    // và match.index (vị trí của char đầu tiên match[0] trong text)
    let tagStartIndex = -1; // Vị trí dấu "{" đầu tiên
    while ((match = regex.exec(text)) !== null) { // tìm lần lượt trong text (nếu ko thấy gì khớp regex nữa thì sẽ về null)
        const char = match[0]; // kí tự khớp regex
        if (char === '\\{' || char === '\\}') continue; // Nếu là "\{", "\}" thì bỏ qua
        if (char === '\\N' && tagStartIndex === -1) { // Nếu là xuống dòng và ngoài tag
            if (match.index > endIndex) tokens.push(text.slice(endIndex, match.index)); // push như dấu "{" cấp 1 và phía trước có text
            tokens.push(`{${char}}`); // Push thành '{\N}' trong tokens
            endIndex = regex.lastIndex; // Lưu endIndex như khi xử lí dấu "}" và sau push
            continue;
        }
        if (char === '{') { // Nếu là dấu "{"
            if (tagStartIndex === -1 && match.index > endIndex) {
                tokens.push(text.slice(endIndex, match.index)); // Là dấu "{" đầu tiên và phía trước có text thì push text
                tagStartIndex = match.index;
            } 
            continue; // Nếu ko phải dấu "{" đầu thì bỏ qua
        } 
        if (char === '}') { // Nếu là dấu "}"
            if (tagStartIndex > -1) { // Nếu có "{" trước đó
                tokens.push(text.slice(tagStartIndex, regex.lastIndex)); // Lấy từ "{" đầu đến hết dấu "}" hiện tại
                endIndex = regex.lastIndex; // index của char sau chuỗi khớp regex (ở đây là sau "}")
                tagStartIndex = -1; // Reset biến này
            } else { // Nếu nhiều dấu "}" hơn "{" (tagStartIndex.length-1 === 0 tức cấp 0)
                continue; // Coi như 1 dấu "\}" (bỏ qua)
            }
        }
    }
    if (endIndex < text.length) { // Xử lí phần còn lại sau dấu đóng cuối.
        const lastText = text.slice(endIndex);
        if (tokens.at(-1)?.at(-1) !== '}') { // Nếu có sẵn token gần nhất, và nó ko phải tag (char cuối ko là "}")
            tokens[tokens.length - 1] += lastText; // Hợp nhất token gần nhất đó (text) và phần còn lại sau nó
            // Dùng tokens.at(-1) sẽ gặp lỗi "ReferenceError: Invalid left-hand side in assignment"
        } else { // Nếu ko có sẵn (tokens = []) hoặc token gần nhất là tag (char cuối là "}")
            tokens.push(lastText);
        }
    }
    return tokens;
}


test = String.raw`hello{{\world}{\my}\N}nice`
console.log("r: "+test);
console.log("m: "+String.raw`${tokenizeM(test)}`);