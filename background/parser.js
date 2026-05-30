// Code bằng tay
// v0.0.0.2 30may26
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
const toCamelCase = (str, indices = [0]) => {
	// Hàm chuyển string thành camelCase.
	// str: string cần chuyển. indices: vị trí đảo lower/upper case (mặc định: kí tự đầu).
    if (!str) return '';
    // Vào trống thì ra trống.
    return str.split('').map((char, index) => {
        if (indices.includes(index)) {
            return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
        }
        return char;
    }).join('');
};
function convertTimeStringToMs(timeStr) {
  // Hàm chuyển timeString theo chuẩn định dạng file Aegisub (h:mm:ss.cs, vd:0:00:13.21 về ms, dạng 1 số nguyên)
  // Sử dụng khi parse các dòng [Event] trong file sub
  const parts = timeStr.split(':');
  const secondsParts = parts[2].split('.');
  // Tách timeStr thành parts (h, mm, ss.cs). Tách ss.cc (parts[2]) thành secondsParts (ss, cs)
  const hours = parseInt(parts[0], 10);
  // Lưu giờ. parseInt(string, radix): chuyển string (số) theo hệ radix từ 2 đến 36.
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
	//0: Smart wrapping, top line is wider
	//1: End-of-line word wrapping, only \N breaks
	//2: No word wrapping, both \n and \N break
	//3: Smart wrapping, bottom line is wider
	// );
	// 3. ScaledBorderAndShadow (yes/no): Nếu bật, thì giá trị border/shadow gắn chặt với tỉ lệ video (PlayResX/Y)
	//Nếu ko, thì giá trị border/shadow là giá trị tuyệt đối, ko phụ thuộc tỉ lệ video 
	// 4. PlayResX và PlayResY (vì đây là kích thước video chuẩn mà sub dựa vào. Mọi thông số font, pos đều phụ thuộc vào nó)
	const parsedData = { info: {}, styles: [], events: [] };
	// Info lưu dưới dạng obj do file sub có cấu trúc key: value
	// Styles và Events lưu dưới dạng array do file sub có cấu trúc khác, và trong Lua Automation của Aegisub cũng xử lí tương tự.
	if (!rawText) {
	console.error(
		"%c[ASS-CEE]%c parser: Đã có ai làm gì đâu? Đã làm gì đâu? (rawText trống)", 
		"color: red; font-weight: bold;",
		"color: white;"
	);
	return parsedData
	};
	// Nếu ko có rawText, trả về Data trống và gửi log lỗi text trống.
	const subtitles = rawText.split(/\r\n/); // Tạm thời chỉ hỗ trợ file sub trên Windows. 
	// Đặt tên là subtitles/subtitle để tương ứng với array subtitles trong Lua Automation của Aegisub.
	// to-do: tùy chọn hỗ trợ Windows (\r\n), Unix (\n)???, Mac (\r)???
	let currentSection = '';
	// index phân đoạn (phần trong dấu []).
	let styleFormat = [];
	let eventFormat = [];
	// Array vì các key và value theo trật tự trong mỗi dòng, và dòng Format (của cả 2 phần) có trật tự cố định
	for (let line of subtitles) {
		// Xét các dòng dữ liệu trong file. line = subtitles[i] (hoặc subs[i]. Subscribe?)
		line = line.trimStart();
		// Xóa khoảng trắng ở đầu dòng dữ liệu (ko cần thiết?)
		const beIgnored = !line || line.startsWith(';');
		if (beIgnored) { continue };
		// Nếu line trống (""), hoặc bắt đầu bằng ";" thì bỏ qua
		// line trống ngăn cách giữa các đoạn. ";" là phần credit của app (trong phần Script Info).
		if (line.startsWith('[') && line.endsWith(']')) {
			// Dòng dữ liệu này ghi phân đoạn. 
			currentSection = line.trim()
			// Lưu tên phân đoạn
			continue;
			// Dòng ko có dữ liệu nào khác nên bỏ qua
		}
		if (currentSection === '[Script Info]') {
			// Trong đoạn Script Info, lưu các thông số:
			// 		Title: để hiển thị.
			// 		ScriptType: để soát chuẩn
			// 		WrapStyle: để xử lí phụ đề.
			// 		PlayResX: để xử lí phụ đề.
			// 		PlayResY: để xử lí phụ đề.
			// 		ScaledBorderAndShadow: để xử lí phụ đề.
			// Tuy nhiên, ở đây lưu tất cả data.
			const index = line.indexOf(':');
			// Lấy dấu ":" để phân cách
            if (index !== -1) {
                const key = line.substring(0, index).trim();
				// .substring(a,b) lấy từ a đến b-1, ko lấy b
                const value = line.substring(index + 1).trim();
				// .substring(b+1) lấy từ b+1 đến hết string.
                parsedData.info[key] = value;
				if (key === 'ScriptType' && value !== 'v4.00+') {
					// ScriptType trong file ko phải v4.00+
					console.error(
						`%c[ASS-CEE]%c parser: %cTin%c File chuẩn chưa em? (Extension ko hỗ trợ tốt với ScriptType=${value})`, 
						"color: red; font-weight: bold;",
						"",
						"color: gray; text-decoration: line-through;",
						""
					);
				}
				// Phần kiểm tra lỗi.
			}
		} else if (currentSection === 'V4+ Styles') {
			// Trong đoạn V4+ Styles, dòng format lưu các key, dòng Style lưu value
			if (line.startsWith('Format:')) {
				// Dòng format, ngăn cách tên các key (ở đây coi là value của array) bởi dấu ","
				styleFormat = line.replace('Format:', '').split(',').map(s => s.trim());
				// Lấy text dòng này, xóa "Format:", tách thành 1 array các value ngăn bởi ",", đổi các value thành value.trim().
				// dòng Format có dạng:
				// Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, ...
				// Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, ...
				// Alignment, MarginL, MarginR, MarginV, Encoding
				// Chú ý: Name của Style đã được Aegisub can thiệp, sẽ ko có dấu "," trong Name. Fontname ko bao giờ có ","
			} else if (line.startsWith('Style:')) {
				// Dòng style lưu các dữ liệu
				const styleValues = line.replace('Style: ', '').split(',').map(s => s.trim());
				// Tương tự dòng Format, ở đây lưu thành các array các values.
				// Thực tế thì Aegisub lưu liền nhau chứ ko có dấu cách sau phẩy như Format.
				// Nên là dùng map(s => s.trim()) không cần thiết (lắm?).
                const style = {};
				// Mỗi 1 style trong array styles là 1 obj. (dặt tên để tương đồng với style trong Lua Automation của Aegisub) 
                styleFormat.forEach((styleField, styleIndex) => {
					// Xét với mỗi index (styleIndex)- value (styleField) trong array styleFormat
                    let styleValue = styleValues[styleIndex] || '';
					// Đặt biến tạm thời styleValue lấy bằng styleValues[styleIndex] (hoặc trống nếu i vượt quá. Có thể vượt quá à?) 
                    if (styleField.toLowerCase().includes('color')) {
						// Nhận diện các styleValue có định dạng màu (tìm theo styleField tương ứng của nó.)
                        styleValue = convertAegisubColorToCss(styleValue);
						// Đổi định dạng màu.
                    }
                    style[toCamelCase(styleField,styleField.includes("Font") ? [0, 4] : [0])] = styleValue;
					// Lưu dữ liệu vào style[toLowerCaseFirst(styleField)]. Ở đây key (styleField) được xử lí (theo camelCase)
					// Căn bản là đổi kí tự đầu (trong Format, nó luôn là upper) thành lower/upper
					// Riêng Fontname và Fontsize (chứa "Font") thì đổi kí tự đầu ("F") và thứ 4 ("n", "s")
					// VD: Ở đây gọi style.primaryColour thì ở Aegisub là style.color1 (trong môi trường line là line.styleref.color1)
                });
				// Chú ý: Name của Style có thể bỏ trống ('') và vẫn hợp lệ
				parsedData.styles.push(style);
			}
		} else if (currentSection === 'Events') {
			// Trong đoạn Events, cấu trúc cũng tương tự đoạn Styles.
			if (line.startsWith('Format:')) { // Dòng format.
				eventFormat = line.replace('Format:', '').split(',').map(s => s.trim());
				// Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
				// Chú ý: Name = Actor (trong giao diện Aegisub), Name đã đc Aegisub can thiệp, cấm dấu ","
				// Tuy nhiên, Text sẽ có dấu "," tự do.
      } else if (line.startsWith('Dialogue:')) { // Dòng Dialogue. (Sẽ không xét các dòng Comment)
				const lineData = line.substring('Dialogue: '.length);
				// Bỏ qua chỗ 'Dialogue: ' đầu line.
				const eventValues = [];
				// Array lưu các giá trị của line (tương tự styleValues ở phần Values)
				// Thay vì chạy thẳng .split().map() như styleValues, eventValues tách "từ từ" để giữ nguyên phần Text.
				let lastCommaPos = 0;
				// Lưu vị trí dấu phẩy liền trước để bỏ qua
				for (let i = 0; i < eventFormat.length - 1; i++) {
					// i < .length -1, hay chạy từ 0 đến .len -2, tức là chạy tất cả format của Events trừ Text.
					const latestCommaPos = lineData.indexOf(',', lastCommaPos);
					// Lưu vị trí dấu phẩy mới nhất để tách lấy dữ liệu
					if (latestCommaPos === -1) break;
					// Nếu ko có dấu phẩy nào nữa thì thoát (do thiếu dấu phẩy? Ko do Aegisub đã chuẩn hóa)
					eventValues.push(lineData.substring(lastCommaPos,latestCommaPos).trim());
					// Thực tế thì Aegisub lưu liền nhau chứ ko có dấu cách sau phẩy như Format.
					// Nên là dùng .trim() không cần thiết (lắm?).
					lastCommaPos = latestCommaPos + 1;
				}
				eventValues.push(lineData.substring(lastCommaPos)); // Phần text.
				const orgline = {}; // Đặt tên để tương đồng với orgline của Lua Automation trong Aegisub.
				eventFormat.forEach((eventField, eventIndex) => {
					// Tương tự phần styles, xét với mỗi index (eventIndex) - value (eventField) trong array eventFormat
					let eventValue = eventValues[eventIndex] || '';
					// Đặt biến tạm thời styleValue lấy bằng styleValues[eventIndex] (hoặc trống nếu eventIndex vượt quá. Có thể vượt quá à?)
					if (eventField === 'Start' || eventField === 'End') {
						// Nếu là thời gian (định dạng h:mm:ss.cs thì convert)
						orgline[eventField.toLowerCase() + 'Time'] = convertTimeStringToMs(eventValue)
						// Và lưu dưới dạng orgline.startTime/endTime (ở Aegisub là orgline.start_time)
					}
					orgline[toCamelCase(eventField)] = eventValue;
				});
				parsedData.events.push(orgline);
      }
		}
	}
	// Phần sắp xếp (để thuận tiện cho renderer). Quy tắc: theo .startTime tăng dần, theo .endTime giảm dần
	if (parsedData.events && parsedData.events.length > 0) {
			parsedData.events.sort((lineA, lineB) => {
					// Tầng 1: So sánh Start Time tăng dần
					if (lineA.startTime !== lineB.startTime) return lineA.startTime - lineB.startTime;
					// Tầng 2: Nếu trùng Start Time -> So sánh End Time GIẢM DẦN
					return lineB.endTime - lineA.endTime;
			});
	}
	console.log(
		"%c[ASS-CEE]%c parser: Đã xử lí xong.", 
		"font-weight: bold;",
		""
	);
	return parsedData;
}