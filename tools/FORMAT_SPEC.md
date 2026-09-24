# Đặc tả nội dung – Cẩm nang phỏng vấn Java Backend (2–4 năm kinh nghiệm)

## Bối cảnh & giọng văn
- Người viết: một giảng viên kiêm người phỏng vấn Java Backend lâu năm, nói chuyện trực tiếp với ứng viên ("bạn"), thẳng thắn, thực chiến, có chính kiến ("Tôi thường hỏi...", "Câu trả lời khiến tôi đánh giá cao là...").
- Người đọc: lập trình viên Java Backend 2–4 năm kinh nghiệm chuẩn bị phỏng vấn vị trí Junior+/Middle tại Việt Nam (công ty outsource lẫn product).
- Ngôn ngữ: **Tiếng Việt có dấu đầy đủ**, giữ thuật ngữ kỹ thuật tiếng Anh (Heap, Bean, Transaction, Isolation Level...).
- Điểm khác Fresher: ứng viên 2–4 năm phải trả lời được "TẠI SAO", "KHI NÀO KHÔNG NÊN", "trade-off", và gắn với trải nghiệm dự án thật. Luôn nhấn mạnh điều này.
- Dùng Java 17/21 và Spring Boot 3.x làm chuẩn (jakarta.*, không javax.*). Không dùng kiến thức lỗi thời (Java 6, EJB, SOAP chỉ nhắc qua nếu cần).
- KHÔNG nhắc tới AI/NLP/PhoBERT/dự đoán lương/RAG/LLM.
- Chính xác kỹ thuật là ưu tiên số 1. Khi tài liệu nguồn sai hoặc lỗi thời, viết theo cách đúng (có thể thêm ghi chú "Nhiều tài liệu cũ nói X — điều này đã không còn đúng từ Java 8...").
- Không dùng emoji trong nội dung (converter tự thêm nhãn cho callout).

## Khuôn mỗi chương
```
# Chương N. Tên chương
Đoạn mở đầu 2–4 câu: vì sao chủ đề này quan trọng với 2–4 năm, người phỏng vấn thường đào tới đâu.

> [!EXPECT]
> Người phỏng vấn muốn kiểm tra gì (3–5 bullet, mức 2–4 năm)

## N.1 Kiến thức cốt lõi ... (có thể nhiều mục ## theo chủ đề con)
Giải thích ngắn gọn, đúng bản chất, có bảng so sánh / code mẫu khi hữu ích.

## N.x Câu hỏi phỏng vấn thường gặp
### Câu hỏi: ...?
Gợi ý trả lời (đoạn văn + bullet) — viết như ứng viên giỏi sẽ nói.
> [!TRAP]
> Bẫy / câu trả lời làm mất điểm (tùy câu)
> [!DEEP]
> Câu hỏi đào sâu (follow-up) người phỏng vấn sẽ hỏi tiếp + ý trả lời ngắn (tùy câu)

## N.y Checklist ôn tập
- [ ] mục cần nắm ...
```

## Cú pháp (converter chỉ hiểu đúng những thứ sau — KHÔNG dùng cú pháp khác)
- `# ` tiêu đề chương (mỗi file đúng 1 dòng `# ` ở đầu). `## ` mục, `### ` mục con. Không dùng `####`.
- Đoạn văn: một dòng = một đoạn. Không ngắt dòng giữa đoạn. Dòng trống giữa các khối.
- Inline: `**đậm**`, `*nghiêng*`, `` `code` ``. Không dùng link markdown, không HTML.
- Danh sách chấm: `- ` (cấp 1), `  - ` (cấp 2, 2 dấu cách). Danh sách số: `1. `, `2. `...
- Checklist: `- [ ] nội dung`.
- Code block: ```` ```java ```` (hoặc sql, yaml, bash, text, json) ... ```` ``` ````. Code phải đúng cú pháp, ngắn gọn (tối đa ~25 dòng/block), comment tiếng Việt được. Đoạn code Java hoàn chỉnh (có class) nên biên dịch được với Java 21.
- Bảng: markdown pipe table, dòng đầu là header, dòng thứ 2 là `|---|---|`. Tối đa 4 cột, nội dung ô ngắn (chỉ inline format).
- Callout: khối các dòng bắt đầu bằng `> `, dòng đầu là một trong các nhãn:
  - `> [!EXPECT]` – Người phỏng vấn muốn kiểm tra gì
  - `> [!TIP]` – Mẹo / điều người phỏng vấn muốn nghe
  - `> [!TRAP]` – Bẫy thường gặp
  - `> [!DEEP]` – Câu hỏi đào sâu
  - `> [!NOTE]` – Ghi chú / sửa lỗi tài liệu cũ
  Các dòng tiếp theo `> nội dung` hoặc `> - bullet`. Không đặt code block trong callout.
- Mỗi khối (đoạn, list, bảng, code, callout) cách nhau 1 dòng trống.

## Nguồn tham khảo
Văn bản trích từ tài liệu người dùng đã thu thập nằm trong thư mục `sources/` cạnh file này. Tận dụng ý hay (HashMap internals, String immutability, ACID/MVCC, @Transactional self-invocation, N+1, idempotent consumer...), nhưng viết lại theo góc nhìn 2–4 năm, không copy nguyên văn, và sửa chỗ sai/lỗi thời.

## BỔ SUNG (vòng 2) – Chuẩn giải thích code và chính tả

### Mọi code block phải có giải thích đầy đủ
Người đọc phải hiểu đoạn code đang minh họa vấn đề gì mà không cần tự suy luận. Mỗi code block theo khuôn 3 phần:
1. **Trước code (1–2 câu):** nêu tình huống / vấn đề mà đoạn code minh họa. Ví dụ: "Đoạn code dưới đây cố đếm số phần tử được thêm vào HashSet bằng cách kế thừa, và cho kết quả sai."
2. **Trong code:** comment ngắn bằng tiếng Việt ở các dòng then chốt (dòng gây lỗi, dòng sửa lỗi, kết quả in ra). Không comment mọi dòng.
3. **Sau code: một đoạn bắt đầu bằng `**Giải thích:**`** nói rõ: chạy code thì chuyện gì xảy ra (kết quả cụ thể), vì sao lại như vậy (cơ chế), và rút ra điều gì / cách sửa. Nếu nhiều ý, dùng bullet ngay sau đoạn đó. Với cặp code "sai / đúng", giải thích cả hai: sai ở đâu, bản đúng khác gì.
- Code SQL, YAML, bash, config cũng áp dụng (giải thích các dòng/tham số quan trọng).
- Nếu đoạn văn ngay sau code đã giải thích đầy đủ thì chỉ cần thêm nhãn `**Giải thích:**` ở đầu đoạn đó và bổ sung phần còn thiếu, không viết lặp.

### Chính tả và thống nhất
- Tiếng Việt có dấu đầy đủ, đúng chính tả; sửa lỗi gõ, câu cụt, lặp từ.
- Thống nhất cách bỏ dấu kiểu phổ thông: **hóa, xóa, hòa, khóa, lũy, thủy, tùy, quý, hủy, thỏa, khỏe** (không dùng hoá, xoá, luỹ, thuỷ, tuỳ, huỷ, thoả...).
- Thuật ngữ tiếng Anh giữ nguyên, viết thống nhất: Heap, Stack, Bean, Transaction, Isolation Level, thread pool, HashMap...
- Xưng hô thống nhất: người viết là "tôi", người đọc là "bạn". Khi viết câu trả lời mẫu của ứng viên thì dùng "tôi" hoặc "em" nhất quán trong cùng một câu trả lời.

## BỔ SUNG (vòng 3) – Viết cho mọi mức kinh nghiệm đọc hiểu được

### Nguyên tắc số 0: chỉ BỔ SUNG, không viết lại
Giữ nguyên các đoạn, ví dụ, bảng và câu hỏi hiện có. Chỉ chèn thêm giải thích, ví dụ, callout RECALL, câu hỏi và tóm tắt vào đúng chỗ. Chỉ sửa câu chữ hiện có khi đoạn đó thực sự khó hiểu hoặc sai kỹ thuật, sửa tối thiểu và ghi lại trong báo cáo. Nếu một câu quá cô đọng, giữ câu đó và thêm đoạn giải thích ngay sau nó.

### Chuẩn cho từng khái niệm
1. **Định nghĩa bằng lời thường trước**, rồi mới dùng thuật ngữ. Không dùng thuật ngữ chưa được giải thích ở mục hiện tại hoặc mục trước. Có thể thêm so sánh đời thường ngắn nếu giúp hiểu.
2. **Đi từ dễ đến khó:** là gì → vì sao cần → hoạt động thế nào → ví dụ code có output → hệ quả thực tế trong dự án (Spring/JPA/production) → câu hỏi phỏng vấn.
3. **Mỗi mục có ít nhất một ví dụ minh họa** (code chạy được có output, hoặc bảng đối chiếu có ví dụ cụ thể). Quy tắc dạng "phải làm X" kèm cặp code **sai** (nêu rõ lỗi/thông báo lỗi) → **sửa**.
4. **Nhắc lại kiến thức liên quan:** khi mục dựa vào khái niệm đã học ở mục/chương khác, đặt callout `> [!RECALL]` ở đầu mục (hoặc ngay trước đoạn dùng tới), 1–3 câu tóm lại khái niệm đó và trỏ tới mục gốc (ví dụ "xem N1.2", "xem mục 6.3"). Không chép lại cả bài.
5. **Callout tự đứng được:** NOTE/TRAP phải nói rõ nhầm lẫn là gì, vì sao sai, đúng là gì, kèm ví dụ ngắn. Không viết kiểu ám chỉ.
6. Giữ nguyên số mục `##` (N1.x, 4.x...) để không vỡ tham chiếu chéo. Nội dung mới đặt trong `###` bên trong mục.

### Callout mới
- `> [!RECALL]` – Nhắc lại kiến thức liên quan (hiển thị "NHẮC LẠI KIẾN THỨC"). Nhãn hợp lệ giờ gồm: EXPECT, TIP, TRAP, DEEP, NOTE, RECALL.

### Câu hỏi tự kiểm tra: nhiều hơn, sâu hơn
- Nền tảng 1–2: mỗi mục kiến thức có 3–5 câu. Mỗi chương chuyên sâu (1–13) có **ít nhất 20 câu**, cộng số câu cũ.
- Tiêu đề câu hỏi ghi mức độ ngay sau chữ "Câu hỏi": `### Câu hỏi (Cơ bản): …?`, `### Câu hỏi (Hiểu sâu): …?`, `### Câu hỏi (Thực chiến): …?`, `### Câu hỏi (Đọc code): …?`. Câu cũ dạng `### Câu hỏi: …` thì thêm nhãn mức độ phù hợp. Tỷ lệ gợi ý: 30% Cơ bản, 35% Hiểu sâu, 20% Thực chiến, 15% Đọc code.
- Dạng câu hỏi cần có:
  - **Đọc code:** tiêu đề ghi đề ngắn, ví dụ `### Câu hỏi (Đọc code): Đoạn code dưới đây in ra gì?`. Khối code đề bài là khối đầu tiên của phần thân, tiếp theo là dòng `**Đáp án:**` và giải thích từng bước. Mọi thứ **trước** dòng `**Đáp án:**` (đề bài, code đề) luôn hiển thị; chỉ phần **sau** dòng đó bị ẩn ở chế độ Tự kiểm tra. Câu hỏi thường không cần dòng `**Đáp án:**` (toàn bộ thân là đáp án).
  - **Vì sao** (hỏi cơ chế), **So sánh** (A khác B, khi nào chọn), **Tình huống thực tế** (production lỗi X, điều tra thế nào), **Tìm lỗi** (code/thiết kế sai ở đâu), **Nối kiến thức** (dùng kiến thức của từ 2 mục trở lên).
- Mỗi đáp án mở đầu bằng **ý chính 1–2 câu** in đậm hoặc câu ngắn rõ ràng, sau đó mới giải thích chi tiết. Câu hay bị hỏi tiếp thì kèm `[!DEEP]`.
- Đặt câu hỏi mới ở cuối mục kiến thức liên quan (Nền tảng), hoặc trong mục "Câu hỏi phỏng vấn thường gặp" của chương (chuyên sâu), nhóm theo chủ đề.

### Tóm tắt trọng tâm
- Mỗi file (trừ ch00, ch14) thêm mục `## <số>. Tóm tắt trọng tâm` (ví dụ `## N1.17 Tóm tắt trọng tâm`, `## 1.10 Tóm tắt trọng tâm`) **ngay trước** mục Checklist, và **đánh số lại chỉ riêng mục Checklist** (ví dụ Checklist N1.17 → N1.18). Đây là ngoại lệ duy nhất của quy tắc giữ số mục.
- 8–15 gạch đầu dòng, mỗi dòng là một điều phải nhớ, viết thành câu hoàn chỉnh có "vì sao".

### Kiểm tra code
- `python3 tools/check_java.py content/<file>.md --run` biên dịch mọi khối Java thuần (Java 21), chạy các class có `main` và in output; output phải khớp comment trong code. Khối cần Spring/JPA/Lombok được SKIP tự động. FAIL do khối cố ý phụ thuộc khối trước, hoặc khối Spring không có import, thì chấp nhận nhưng ghi vào báo cáo.

### Comment trong code viết bằng tiếng Anh (quy tắc mới, áp dụng cho mọi khối code)
- Mọi comment trong code block (java, sql, bash, yaml, dockerfile, json...) viết bằng **tiếng Anh**, ngắn gọn, đúng nghĩa. Ví dụ `// hiding, not overriding`, `-- keep the smallest id`.
- Chuỗi in ra trong code (`System.out.println("...")`) có thể giữ tiếng Việt nếu là dữ liệu minh họa; comment output kỳ vọng viết dạng `// prints: ...`.
- Phần văn giải thích ngoài code (đoạn văn, **Giải thích:**, callout, câu hỏi) vẫn viết **tiếng Việt**.
- Khi dịch comment cũ sang tiếng Anh, giữ nguyên ý; không đổi code.
