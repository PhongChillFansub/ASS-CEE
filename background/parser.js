// Code bằng tay
// v0.0.8 28juy26
// parser.js
// Chức năng: xử lí kế tiếp, giai đoạn từ giai đoạn có file sub thô (rawText) đến cấu trúc file sub JS (line.raw)
// Mẫu text của các line [Events] trong file sub
// [Events]
// Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
// Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0000,0000,0000,,
// (Chỉnh sửa để dễ đọc hơn):
// Format:      Layer,  Start,      End,        Style,    Name,   MarginL,  MarginR,  MarginV,  Effect, Text
// Dialogue:    0,      0:00:00.00, 0:00:05.00, Default,      ,   0000,     0000,     0000,          ,
// định dạng:	index,  h:mm:ss.cs, h:mm:ss.cs, string,   string, px,       px,       px,       string  string
// !: Margin có thể là 0000 (undefined chuyển thành) hoặc 0 (defined). Xử lí cả 2 như giá trị 0
// !: Name trong Aegisub chính là line.actor. Nếu trong line.actor có dấu "," thì sẽ bị lưu thành ";".
FALLBACK_DEFAULT_STYLE: {						// Mẫu style sau chuẩn hóa
	name: "Default";							// Tên style (style.name, line.styleref.name, syl.style.name)
	fontName: "Arial";                          // Tên font (\fn)
	fontSize: "20";                             // Font size (\fs, px, với PlayRes 640x480)
	primaryColour: "rgba(255,255,255,1.0)";     // Màu 1, main (\1c)
	secondaryColour: "rgba(255,0,0,1.0)";       // Màu 2, pre-kara (\2c)
	outlineColour: "rgba(0,0,0,1.0)";           // Màu 3, outline (\3c)
	backColour: "rgba(0,0,0,1.0)";              // Màu 4, shadow (\4c)
	bold: false;                                // In đậm (\b, boolean)
	italic: false;                              // In nghiêng (\i, boolean)
	underline: false;                           // Gạch dưới (\u, boolean)
	strikeOut: false;                           // Gạch ngang (\s, boolean)
	scaleX: "100";                              // ScaleX (\fscx, %)
	scaleY: "100";                              // ScaleY (\fscx, %)
	spacing: "0";                               // (\fsp, px)
	angle: "0";                                 // (\fr hoặc \frz, degree)
	borderStyle: "1";                           // Kiểu border (1: viền thường, 3: box)
	outline: "2";                               // (\bord, px. có \xbord và \ybord)
	shadow: "2";                                // (\shad, px. có \xshad và \yshad)
	alignment: "2";                             // (\an, 1-9 kiểu numpad)
	marginL: "20";                              // (px, left)
	marginR: "20";                              // (px, right)
	marginV: "20";                              // (px, vertical)
	encoding: "1";                              // (\fe, nên bị bỏ qua.)
};
/**
 * Hàm chuyển string sang CamelCase (thực chất là tùy chỉnh đảo lower/upper)
 * @param {string} str string
 * @param {Array} indices vị trí đảo lower/upper case (mặc định: kí tự đầu).
 * @returns string đã chuyển đổi
 */
const toCamelCase = (str, indices = [0]) => {
    if (!str) return ''; // Vào trống thì ra trống.
    return Array.from(str, (char, index) => indices.includes(index) ? (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()) : char).join('');    
};
/**
 * Hàm chuyển từ dạng hh:mm:cc.cs thành số (ms)
 * @param {string} t 
 * @returns (ms)
 */
const convertTimeStringToMs = t => {
    try { return t.split(':').reduce((acc, v) => acc * 60 + +v, 0) || 0; } catch { return 0;}
};
/**
 * Hàm chuyển đổi string màu trong Aegisub (&HAABBGGRR với style, &HBBGGRR& với inline) thành định dạng CSS (rgba())
 * @param {*} ascStr 
 * @returns string rgba cho CSS
 */
function convertAegisubColorToCss(ascStr) {
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
/**
 * Hàm xử lí cho các giá trị số trong info
 * @param {Number} v giá trị đầu vào
 * @param {Number} def giá trị mặc định
 * @param {Number} min giá trị tối thiểu
 * @param {Number} max giá trị tối đa
 */
function parseClampedNum (v, def, min, max) {
	const raw = Number.parseInt(v, 10);
	return Number.isNaN(raw) ? def : Math.min(Math.max(raw, (min ?? -Infinity)), (max ?? Infinity));
}
export default function parser(rawText) {
	// Hàm đọc text của file Aegisub.
	// Cấu trúc file Aegisub gồm 4 phần: [Script Info], [Aegisub Project Garbage], [V4+ Styles], [Events]
	// Trong đó, phần Garbage ko cần quan tâm. Phần Styles lưu các style, Events chứa các dòng comment (và code effect), và các dòng Dialogue
	// Script Info cần lấy các thông tin:
	// 1. ScriptType (chỉ hỗ trợ "v4.00+", nếu ko thì trả về lỗi file sub không chuẩn); 
	// 2. WrapStyle (0-3):(
	//		0: Smart wrapping, top line is wider
	//		1: End-of-line word wrapping, only \N breaks
	//		2: No word wrapping, both \n and \N break
	//		3: Smart wrapping, bottom line is wider
	// );
	// 3. ScaledBorderAndShadow (yes/no): Nếu bật, thì giá trị border/shadow gắn chặt với tỉ lệ video (PlayResX/Y)
	//Nếu ko, thì giá trị border/shadow là giá trị tuyệt đối, ko phụ thuộc tỉ lệ video 
	// 4. PlayResX và PlayResY (vì đây là kích thước video chuẩn mà sub dựa vào. Mọi thông số font, pos đều phụ thuộc vào nó)
	const parsedData = { info: {}, styles: [], events: [], globalCss: {}, styleCss: [], lineCss: [] };
	// Info lưu dưới dạng obj do file sub có cấu trúc key: value
	// Styles và Events lưu dưới dạng array do file sub có cấu trúc khác, và trong Lua Automation của Aegisub cũng xử lí tương tự.
	if (!rawText) {
		console.warn("[PD-47.ass] parser: Đã có ai làm gì đâu? Đã làm gì đâu? (rawText trống)");
		return parsedData;
	};
	// Nếu ko có rawText, trả về Data trống và gửi log lỗi text trống.
	const subtitles = rawText.split(/\r?\n/); 
	// Đặt tên là subtitles/subtitle để tương ứng với array subtitles trong Lua Automation của Aegisub.
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
		if (beIgnored) { continue }; // Nếu line trống (""), hoặc bắt đầu bằng ";" thì bỏ qua. ";" là phần credit của app (trong phần Script Info).
		if (line.startsWith('[') && line.endsWith(']')) { currentSection = line.trim(); continue; } // Lưu phân đoạn
		let isContinuation = currentSection === '[Events]' && 
		                     !line.startsWith('Dialogue:') && 
		                     !line.startsWith('Comment:') && 
		                     !line.startsWith('Format:');
		if (isContinuation) {
			if (parsedData._lastRawDialogue) {
				parsedData.events.pop(); // Loại bỏ dòng Dialogue bị lỗi, thiếu trường trước đó
				line = parsedData._lastRawDialogue.raw + '\n' + line; // Ghép dòng lỗi đó với dòng hiện tại
				isContinuation = false; // Đánh dấu đã khôi phục xong để tiếp tục parse phía dưới
			} else {
				continue; // Bỏ qua nếu là dòng rác hoặc dòng comment bị lỗi xuống dòng
			}
		}
		if (!isContinuation) {
			parsedData._lastRawDialogue = null; // Reset trạng thái nếu đây là dòng chuẩn mới
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
			const [, key, value] = line.match(/^([^:]+):(.*)$/) || []; // gán bằng Regex: tách thành phần trước và sau dấu ":" thứ nhất
			if (key) {
				const k = key.trim(), v = value.trim();
				parsedData.info[k] = v;
				if (k === 'ScriptType' && v !== 'v4.00+') { // Ko đảm bảo nếu ScriptType trong file ko phải v4.00+
					console.warn(`[PD-47.ass] parser: Tin... File chuẩn chưa em? (Extension ko hỗ trợ tốt với ScriptType=${v})`);
				}
			}
		} else if (currentSection === '[V4+ Styles]') {
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
                    if (styleField.toLowerCase().includes('colour')) {
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
		} else if (currentSection === '[Events]') {
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
				orgline.raw = line; // Lưu lại chuỗi gốc đề phòng dòng tiếp theo bị ngắt
				parsedData._lastRawDialogue = orgline; // Lưu tham chiếu dòng dialogue mới nhất
				parsedData.events.push(orgline);
    		}
		}
	}
	console.log("[PD-47.ass] parser: Đã xử lí thô.", parsedData);
	// Phần xử lí chuyển đổi sang CSS. Sử dụng globalCss, styleCss và lineCss.
	// Phần globalCss (các giá trị trong info)
    parsedData.info.WrapStyle = parseClampedNum(parsedData.info.WrapStyle, 0, 0, 3); // Chuẩn hóa WrapStyle
	parsedData.info.PlayResX = parseClampedNum(parsedData.info.PlayResX, 640, 640); // Chuẩn hóa PlayResX
	parsedData.info.PlayResY = parseClampedNum(parsedData.info.PlayResY, 480, 480); // Chuẩn hóa PlayResY
	parsedData.globalCss = {
        'white-space': (parsedData.info.WrapStyle === 2 ? 'pre' : 'pre-wrap'),
        'word-break' : 'keep-all',
        'overflow-wrap': 'break-word',
        'text-wrap': (parsedData.info.WrapStyle === 3 ? 'balance' : parsedData.info.WrapStyle === 1 ? 'wrap' : 'pretty'),
        'max-width': '100%',
    };
	// Phần styleCss (các giá trị trong style)
	// Dựa trên giả định khung video là PlayRes(X-Y).
	parsedData.styles.forEach((style) => {
		styleParsedToCss()
	});


	return parsedData;
}