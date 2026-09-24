# Cẩm nang phỏng vấn Java Backend

Website: **https://boy2407.github.io/java-interview-handbook/**

Cẩm nang phỏng vấn Java Backend từ nền tảng Fresher đến lập trình viên 2–4 năm kinh nghiệm, viết dưới góc nhìn giảng viên kiêm người phỏng vấn. Website dựng bằng [VitePress](https://vitepress.dev/), tự động deploy lên GitHub Pages mỗi khi push nhánh `main`.

## Tính năng

- Sidebar theo 4 nhóm (Bắt đầu, Nền tảng Fresher, Chuyên sâu, Phụ lục), mục lục riêng từng trang.
- Tìm kiếm ngay trên trang, gõ **không dấu** vẫn ra kết quả (ví dụ gõ "khoa" ra "khóa").
- **Chế độ tự kiểm tra** (nút trên navbar): ẩn gợi ý trả lời cho tới khi bạn bấm "Hiện gợi ý trả lời", để tự trả lời trước khi xem đáp án.
- **Checklist lưu tiến độ**: tick các mục checklist cuối mỗi chương, trạng thái lưu trên trình duyệt (localStorage), có thanh hiển thị phần trăm đã hoàn thành.
- Nút tải bản Word đầy đủ ở trang chủ và navbar.
- Chế độ tối, hiển thị tốt trên điện thoại.

## Cấu trúc

```
content/            # Nguồn nội dung gốc — SỬA Ở ĐÂY (markdown rút gọn, xem tools/FORMAT_SPEC.md)
tools/
  prepare-docs.mjs  # content/*.md -> docs/*.md cho VitePress (callout, câu hỏi/đáp án, checklist)
  build-docx.cjs    # content/*.md -> docs/public/cam-nang-java-backend.docx
  FORMAT_SPEC.md    # Quy ước cú pháp markdown và giọng văn
docs/
  index.md          # Trang chủ
  .vitepress/        # Cấu hình, theme, CSS tùy biến
  public/            # File tĩnh (logo, file Word tải về)
.github/workflows/deploy.yml   # Build & deploy GitHub Pages khi push main
```

`docs/*.md` (trừ `index.md`) và `docs/.vitepress/nav-data.json` được **sinh tự động**, không commit (xem `.gitignore`) — sửa nội dung luôn bắt đầu từ `content/`.

## Chạy ở máy local

```bash
npm install
npm run docs:dev       # http://localhost:5173/java-interview-handbook/
```

## Sửa nội dung

1. Sửa file tương ứng trong `content/` (theo đúng cú pháp trong `tools/FORMAT_SPEC.md`: callout `> [!TIP]`/`[!TRAP]`/`[!DEEP]`/`[!NOTE]`/`[!EXPECT]`, câu hỏi bắt đầu bằng `### Câu hỏi:`, checklist `- [ ] ...`).
2. Xem thử: `npm run docs:dev`.
3. Build lại file Word (không bắt buộc mỗi lần, nhưng nên làm trước khi release): `npm run docx`.
4. Commit và push nhánh `main` — GitHub Actions tự build và deploy site.

## Build thủ công

```bash
npm run docs:build     # sinh docs/*.md rồi build ra docs/.vitepress/dist
npm run docs:preview   # xem thử bản đã build
npm run docx           # xuất lại docs/public/cam-nang-java-backend.docx
```
