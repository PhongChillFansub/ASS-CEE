// Code bằng tay
// v0.0.0.1 19may26
// Mẫu text của các line [Events] trong file sub
// [Events]
// Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
// Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0000,0000,0000,,
// (Chỉnh sửa để dễ đọc hơn)
// Format:      Layer,  Start,      End,        Style,    Name,   MarginL,  MarginR,  MarginV,  Effect, Text
// Dialogue:    0,      0:00:00.00, 0:00:05.00, Default,      ,   0000,     0000,     0000,          ,
// đơn vị:      index,  h:mm:ss.cs, h:mm:ss.cs, string,   string, px,       px,       px,       string  string
// !: Margin có thể là 0000 (undefined chuyển thành) hoặc 0 (defined). Xử lí cả 2 như giá trị 0
// !: Name trong Aegisub chính là line.actor. Nếu trong line.actor có dấu "," thì sẽ bị lưu thành ";".

function convertTimeStringToMs(timeStr) {
  // Hàm chuyển timeString theo chuẩn định dạng file Aegisub (h:mm:ss.cs, vd:0:00:13.21 về ms, dạng 1 số nguyên)
  // Sử dụng khi parse các dòng [Event] trong file sub
  const parts = timeStr.split(':');
  const secondsParts = parts[2].split('.');
  // Tách timeStr thành parts (h, mm, ss.cs). Tách ss.cc (parts[2]) thành secondsParts (ss, cs)
  const hours = parseInt(parts[0], 10);
  // Lưu giờ
  const minutes = parseInt(parts[1], 10);
  // Lưu phút
  const seconds = parseInt(secondsParts[0], 10);
  const centiseconds = parseInt(secondsParts[1], 10);
  // Lưu giây và phần centi-giây
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + centiseconds * 10;
  // Tính toán, trả kết quả. 
}

function convertAegisubColorToCss(ascStr) {
  // Hàm chuyển đổi string màu trong Aegisub (&HAABBGGRR với style, &HBBGGRR& với inline) thành định dạng CSS (rgba())
  let hex = ascStr.replace(/&H|&/g, ''); // Loại bỏ ký tự định dạng &H và & của string màu (định dạng mới AABBGGRR/BBGGRR)
  if (!hex) return 'rgba(0,0,0,0)'; // Nếu string màu trống (&H&), coi như màu đen
  hex = hex.padStart(8, '0'); // Chuyển về chuẩn AABBGGRR
  // Trong định dạng màu Aegisub: Alpha theo cơ chế tính ngược (00: Opaque, FF: Transparent)
  // Còn lại đều là tính xuôi. Và tất cả đều là hệ 16
  const a = ((255 - parseInt(hex.substring(0, 2), 16)) / 255).toFixed(2);
  const b = parseInt(hex.substring(2, 4), 16);
  const g = parseInt(hex.substring(4, 6), 16);
  const r = parseInt(hex.substring(6, 8), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function parseAegisubRaw(rawText) {
  // Hàm đọc text của file Aegisub.
  // Cấu trúc file Aegisub gồm 4 phần: [Script Info], [Aegisub Project Garbage], [V4+ Styles], [Events]
  // Trong đó, phần Garbage ko cần quan tâm. Phần Styles lưu các style, Events chứa các dòng comment (và code effect), và các dòng Dialogue
  // Script Info cần lấy các thông tin:
  // 1. ScriptType (chỉ hỗ trợ "v4.00+", nếu ko thì trả về lỗi file sub không chuẩn); 
  // 2. WrapStyle (0-3):(
  //    0: Smart wrapping, top line is wider
  //    1: End-of-line word wrapping, only \N breaks
  //    2: No word wrapping, both \n and \N break
  //    3: Smart wrapping, bottom line is wider
  // );
  // 3. ScaledBorderAndShadow (yes/no): Nếu bật, thì giá trị border/shadow gắn chặt với tỉ lệ video (PlayResX/Y)
  //    Nếu ko, thì giá trị border/shadow là giá trị tuyệt đối, ko phụ thuộc tỉ lệ video 
  // 4. PlayResX và PlayResY (vì đây là kích thước video chuẩn mà sub dựa vào. Mọi thông số font, pos đều phụ thuộc vào nó)
  const parsedData = { info: {}, styles: {}, events: [] };
  // to-do: Giải thích cấu trúc info, styles, events sau khi parse.
  if (!rawText) {
    console.log(
      "%c[ASS-CEE]%c parser: Đã có ai làm gì đâu? Đã làm gì đâu? (rawText trống)", 
      "color: red; font-weight: bold;",
      "color: white;"
    );
    return parsedData
  };
  // Nếu ko có rawText, trả về Data trống và gửi log lỗi text trống.
  // to-do: viết tiếp đoạn này
  const lines = rawText.split(/\r\n/); //
  let currentSection = '';
  let styleFormat = [];
  let eventFormat = [];


}



export default function parseASS(rawText) {
    const parsedData = { info: {}, styles: {}, events: [] };
    if (!rawText) return parsedData;
    const lines = rawText.split(/\r?\n/);
    let currentSection = '';
    let styleFormat = [];
    let eventFormat = [];
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith(';')) continue; // Bỏ qua dòng trống và bình luận
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.substring(1, line.length - 1).trim();
            continue;
        }
        if (currentSection === 'Script Info') {
            const index = line.indexOf(':');
            if (index !== -1) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim();
                parsedData.info[key] = value;
            }
        } else if (currentSection === 'V4+ Styles' || currentSection === 'V4 Styles') {
            if (line.startsWith('Format:')) {
                styleFormat = line.replace('Format:', '').split(',').map(s => s.trim());
            } else if (line.startsWith('Style:')) {
                const values = line.replace('Style:', '').split(',').map(s => s.trim());
                const styleObj = {};
                styleFormat.forEach((field, i) => {
                    let val = values[i] || '';
                    if (field.toLowerCase().includes('color')) {
                        val = assColorToCss(val);
                    }
                    styleObj[field] = val;
                });
                if (styleObj.Name) {
                    parsedData.styles[styleObj.Name] = styleObj;
                }
            }
        } else if (currentSection === 'Events') {
            if (line.startsWith('Format:')) {
                eventFormat = line.replace('Format:', '').split(',').map(s => s.trim());
            } else if (line.startsWith('Dialogue:')) {
                const rest = line.substring('Dialogue:'.length);
                const values = [];
                let currentPos = 0;
                // Phân tách chuỗi an toàn, không làm vỡ cột Text cuối cùng chứa nhiều dấu phẩy
                for (let i = 0; i < eventFormat.length - 1; i++) {
                    const nextComma = rest.indexOf(',', currentPos);
                    if (nextComma === -1) break;
                    values.push(rest.substring(currentPos, nextComma).trim());
                    currentPos = nextComma + 1;
                }
                values.push(rest.substring(currentPos).trim()); // Cột Text cuối cùng
                const eventObj = {};
                eventFormat.forEach((field, i) => {
                    let val = values[i] || '';
                    if (field === 'Start' || field === 'End') {
                        eventObj[field + 'Ms'] = timeToMs(val);
                    }
                    eventObj[field] = val;
                });
                parsedData.events.push(eventObj);
            }
        }
    }
    return parsedData;
}

function parseAssContent(fileContent) {
  // 1. Tách chuỗi thành mảng các dòng (hỗ trợ cả Windows \r\n và Unix \n)
  const lines = fileContent.split(/\r?\n/);
  const subtitles = [];

  // 2. Duyệt qua từng dòng
  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      
      // Kiểm tra độ dài an toàn
      if (parts.length < 10) continue;

      // Trích xuất raw text (từ index 9 trở đi)
      let rawText = parts.slice(9).join(',').trim();
      
      // Dùng Regex để xóa các tag định dạng của ASS như {\i1}, {\c&H0000FF&}
      // Đây là bước "làm sạch" sub rất quan trọng
      const cleanText = rawText.replace(/\{.*?\}/g, '');

      subtitles.push({
        startTime: parts[1].trim(),
        endTime: parts[2].trim(),
        text: cleanText
      });
    }
  }

  return subtitles;
}


// vibe coding (Gemini)
// v0.0.0.4 17may26 (chưa thể review do chưa đủ TRÌNH.)
// Cập nhật: Gemini viết nốt
// well, bạn mong chờ gì ở 1 thằng mù JS nhỉ :v
// to-do: chắc sẽ đem đi hỏi Copilot sau.