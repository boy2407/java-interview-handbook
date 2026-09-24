# Nền tảng 2. SQL, Web, Spring và Hibernate cơ bản (kiến thức Fresher)

Phần này dành cho bạn mới ra trường hoặc dưới một năm kinh nghiệm, và cho cả những bạn 2–4 năm muốn rà lại nền móng trước khi đọc các chương chuyên sâu. Vòng Fresher thường hỏi đúng những câu dưới đây: định nghĩa, so sánh, viết một câu SQL, giải thích một annotation. Tôi không chấm việc bạn thuộc lòng, tôi chấm việc bạn giải thích bằng lời của mình và đưa ra được ví dụ.

> [!EXPECT]
> - Viết được SQL cơ bản: JOIN, GROUP BY/HAVING, subquery, tìm bản ghi trùng, lương cao thứ hai.
> - Hiểu HTTP và đường đi của một request từ Tomcat vào tới Controller.
> - Giải thích IoC/DI, bean, các annotation phổ biến và tự dựng được một API CRUD.
> - Nắm JPA/Hibernate cơ bản: mapping, quan hệ, lazy/eager, trạng thái entity.
> - Nhận ra các design pattern phổ biến, dùng được Git và vài lệnh Linux.

## N2.1 SQL: schema mẫu và ràng buộc

### Bảng, dòng, cột và khóa bằng lời thường

Trước khi đọc DDL, hãy nắm vài từ sẽ dùng suốt phần SQL. Một **cơ sở dữ liệu quan hệ** (MySQL, PostgreSQL) lưu dữ liệu thành các **bảng** (table), giống một sheet Excel có tên. Mỗi **cột** (column) là một thuộc tính có kiểu cố định, ví dụ cột `salary` luôn là số. Mỗi **dòng** (row, còn gọi là bản ghi, record) là một đối tượng cụ thể, ví dụ nhân viên An. **SQL** là ngôn ngữ để tạo bảng, thêm, sửa, xóa và hỏi dữ liệu.

| Khái niệm | Nói bằng lời thường | Ví dụ trong schema dưới |
|---|---|---|
| Khóa chính (primary key) | Cột dùng để chỉ đích danh một dòng, không trùng, không trống | `employees.id`: An là nhân viên số 1 |
| Khóa ngoại (foreign key) | Cột ở bảng này trỏ tới khóa chính của bảng khác | `employees.department_id` trỏ tới `departments.id` |
| Ràng buộc (constraint) | Luật DB tự kiểm tra mỗi lần ghi, sai luật thì từ chối | `NOT NULL`, `UNIQUE`, `CHECK (salary > 0)` |
| NULL | "Không có giá trị / chưa biết", khác số 0 và chuỗi rỗng | Dũng chưa thuộc phòng nào: `department_id` là NULL |

Vì sao cần ràng buộc trong DB khi code Java đã kiểm tra rồi? Vì dữ liệu còn được ghi từ nhiều nơi khác: script migration, một service khác, người vận hành gõ tay. Ràng buộc là lớp bảo vệ cuối cùng, không ai đi vòng qua được.

Toàn bộ phần SQL dùng chung một schema nhỏ. Đoạn DDL dưới tạo bảng phòng ban, nhân viên, nhân viên tham gia dự án, kèm đủ các loại ràng buộc hay bị hỏi.

```sql
CREATE TABLE departments (
    id     BIGINT PRIMARY KEY,
    name   VARCHAR(100) NOT NULL UNIQUE,
    budget DECIMAL(15,2) CHECK (budget >= 0)      -- MySQL enforces CHECK only since 8.0.16
);
CREATE TABLE employees (
    id            BIGINT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    salary        DECIMAL(12,2) NOT NULL CHECK (salary > 0),
    department_id BIGINT,                         -- NULL: not in any department yet
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
CREATE TABLE employee_projects (
    employee_id BIGINT NOT NULL,
    project_id  BIGINT NOT NULL,
    PRIMARY KEY (employee_id, project_id),        -- composite key: key made of 2 columns
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
INSERT INTO departments VALUES (1, 'IT', 50000), (2, 'HR', 20000), (3, 'Sales', 30000);
INSERT INTO employees VALUES (1, 'An', 'an@corp.vn', 2000, 1), (2, 'Bình', 'binh@corp.vn', 1500, 1),
    (3, 'Chi', 'chi@corp.vn', 1200, 2), (4, 'Dũng', 'dung@corp.vn', 1000, NULL);
```

**Giải thích:** `PRIMARY KEY` định danh mỗi dòng và ngầm `NOT NULL`; `UNIQUE` cấm trùng; `CHECK` kiểm tra điều kiện từng dòng; `FOREIGN KEY` bắt `department_id` trỏ tới phòng có thật (chèn phòng 9 sẽ bị từ chối). Chỉ cặp `(employee_id, project_id)` là duy nhất, nên khóa chính của bảng dự án là composite key. Dữ liệu mẫu cố ý có phòng Sales không có ai và Dũng chưa có phòng. `id` gán tay để chạy được trên cả hai DB; thực tế MySQL dùng `AUTO_INCREMENT`, PostgreSQL dùng `GENERATED ALWAYS AS IDENTITY`.

Sau khi chạy đoạn trên, hai bảng chính trông như sau. Hãy nhớ hai bảng này, mọi ví dụ JOIN, GROUP BY bên dưới đều tính trên chúng.

| departments.id | name | budget |
|---|---|---|
| 1 | IT | 50000 |
| 2 | HR | 20000 |
| 3 | Sales | 30000 |

| employees.id | full_name | salary | department_id |
|---|---|---|---|
| 1 | An | 2000 | 1 |
| 2 | Bình | 1500 | 1 |
| 3 | Chi | 1200 | 2 |
| 4 | Dũng | 1000 | NULL |

> [!RECALL]
> Cột tiền dùng `DECIMAL(12,2)` vì cùng lý do Java dùng `BigDecimal` thay cho `double`: số thực nhị phân không biểu diễn chính xác 0.1, cộng dồn sẽ lệch (xem N1.2). JPA map `DECIMAL` sang `BigDecimal`.

### Ràng buộc chặn dữ liệu sai như thế nào

Quy tắc "khóa ngoại phải trỏ tới dòng có thật" nghe trừu tượng, nhìn lệnh bị từ chối sẽ rõ hơn. Ba lệnh dưới đều vi phạm một ràng buộc:

```sql
INSERT INTO employees VALUES (5, 'Em', 'em@corp.vn', 1300, 9);   -- department 9 does not exist
INSERT INTO employees VALUES (6, 'Giang', 'an@corp.vn', 900, 1); -- email already used by An
INSERT INTO employees VALUES (7, 'Hà', 'ha@corp.vn', 0, 1);      -- salary must be > 0

-- Fix: point to an existing department (or NULL), use a new email, a positive salary
INSERT INTO employees VALUES (5, 'Em', 'em@corp.vn', 1300, 2);
```

**Giải thích:** lệnh đầu bị MySQL từ chối với `ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails`, PostgreSQL báo `violates foreign key constraint`. Lệnh hai báo `ERROR 1062 (23000): Duplicate entry 'an@corp.vn' for key 'employees.email'`. Lệnh ba vi phạm `CHECK`. Không có dòng nào được ghi, dữ liệu trong bảng giữ nguyên. Chiều ngược lại cũng được bảo vệ: `DELETE FROM departments WHERE id = 1` bị từ chối vì An và Bình còn trỏ tới phòng IT; muốn xóa phải chuyển nhân viên đi trước, hoặc khai báo `ON DELETE SET NULL` / `ON DELETE CASCADE` trên khóa ngoại nếu nghiệp vụ cho phép. Tôi đã chạy thử các lệnh này trên SQLite (bật `PRAGMA foreign_keys = ON`) và cả ba đều bị từ chối.

Các nhóm lệnh: **DDL** định nghĩa cấu trúc (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), **DML** thao tác dữ liệu (`SELECT`, `INSERT`, `UPDATE`, `DELETE`; có tài liệu tách `SELECT` thành DQL), **DCL** phân quyền (`GRANT`, `REVOKE`), **TCL** điều khiển transaction (`COMMIT`, `ROLLBACK`, `SAVEPOINT`).

### Câu hỏi (Cơ bản): Primary key khác Unique key thế nào? Composite key là gì?

Mỗi bảng có tối đa một primary key, không được NULL. Unique key có thể có nhiều và cho phép NULL. Cả hai đều tự tạo index. Composite key là khóa gồm từ hai cột trở lên trong **một** bảng: từng cột có thể trùng nhưng tổ hợp thì duy nhất; trong JPA map bằng `@EmbeddedId` hoặc `@IdClass`.

> [!TRAP]
> Tài liệu cũ định nghĩa composite key là "khóa gồm hai bảng". Sai: đó là nhiều cột trong một bảng; khóa liên kết hai bảng là foreign key.

### Câu hỏi (Cơ bản): Foreign key dùng để làm gì? Không khai báo foreign key thì sao?

**Foreign key giữ tính toàn vẹn tham chiếu: không cho một dòng trỏ tới dòng không tồn tại, và không cho xóa dòng đang bị trỏ tới.** Không khai báo thì code vẫn JOIN được bình thường, nhưng DB không còn canh giữ: một bug hoặc một câu `DELETE` tay có thể để lại nhân viên thuộc "phòng 9" không tồn tại (dữ liệu mồ côi), và các báo cáo JOIN sẽ lặng lẽ thiếu dòng. Một số hệ thống lớn cố ý bỏ foreign key để ghi nhanh hoặc vì dữ liệu nằm ở nhiều DB; khi đó ứng dụng phải tự đảm bảo, và bạn nên nói được trade-off này.

### Câu hỏi (Đọc code): Với dữ liệu mẫu ở trên, lệnh nào chạy thành công?

```sql
INSERT INTO departments VALUES (4, 'it', 1000);
INSERT INTO departments VALUES (5, 'Legal', NULL);
INSERT INTO employee_projects VALUES (1, 10), (1, 11), (2, 10);
INSERT INTO employee_projects VALUES (1, 10);
```

**Đáp án:**

Ba lệnh đầu thành công, lệnh cuối bị từ chối.

- `'it'` chữ thường: với PostgreSQL và SQLite so sánh chuỗi phân biệt hoa thường nên không trùng `'IT'`; MySQL với collation mặc định `utf8mb4_0900_ai_ci` **không** phân biệt hoa thường nên báo Duplicate entry. Đây là câu hay để hỏi ngược người phỏng vấn "DB nào?".
- `budget` NULL: `CHECK (budget >= 0)` với NULL cho UNKNOWN, và CHECK chỉ từ chối khi kết quả là FALSE, nên NULL được chấp nhận. Muốn cấm thì thêm `NOT NULL`.
- Ba cặp `(1,10)`, `(1,11)`, `(2,10)` đều khác nhau dù cột đơn lẻ có lặp.
- `(1, 10)` lần hai trùng composite key nên bị từ chối.

### Câu hỏi (Hiểu sâu): TRUNCATE thuộc nhóm lệnh nào, và vì sao điều đó quan trọng?

**TRUNCATE là DDL, không phải DML, nên nó hành xử như thao tác trên cấu trúc bảng chứ không phải xóa từng dòng.** Hệ quả: MySQL tự commit ngầm trước và sau TRUNCATE nên không rollback được, không chạy trigger `DELETE`, và reset bộ đếm auto increment. PostgreSQL là ngoại lệ, TRUNCATE nằm trong transaction được. Vì vậy khi viết script dọn dữ liệu trên production, tôi dùng `DELETE ... WHERE` trong transaction nếu cần khả năng quay lại.

## N2.2 SELECT, JOIN và GROUP BY

Câu cơ bản `SELECT full_name, salary FROM employees WHERE department_id IS NOT NULL ORDER BY salary DESC LIMIT 2` trả An (2000), Bình (1500). So với NULL phải dùng `IS NULL`/`IS NOT NULL`: viết `= NULL` luôn ra rỗng vì mọi so sánh với NULL cho UNKNOWN. `LIMIT` chạy trên MySQL và PostgreSQL; cú pháp chuẩn `FETCH FIRST 2 ROWS ONLY` chỉ PostgreSQL hỗ trợ.

Câu SELECT được đọc theo từng mệnh đề: `FROM` chọn bảng, `WHERE` giữ những dòng thỏa điều kiện, `SELECT` chọn cột hiển thị, `ORDER BY` sắp xếp, `LIMIT` cắt lấy N dòng đầu. Cặp sai/đúng với NULL dưới đây là lỗi người mới gặp nhiều nhất:

```sql
SELECT full_name FROM employees WHERE department_id = NULL;   -- wrong: always 0 rows
SELECT full_name FROM employees WHERE department_id IS NULL;  -- right: Dũng
```

**Giải thích:** câu đầu không báo lỗi gì, chỉ trả về rỗng, nên rất khó phát hiện. SQL dùng logic ba giá trị: TRUE, FALSE và UNKNOWN. `NULL = NULL` không phải TRUE mà là UNKNOWN (vì "không biết" so với "không biết" thì vẫn không biết), và WHERE chỉ giữ dòng có điều kiện TRUE. `IS NULL` là toán tử riêng trả TRUE/FALSE rõ ràng.

JOIN ghép dòng của hai bảng theo điều kiện `ON`. Hai câu dưới chỉ khác một từ khóa.

```sql
SELECT e.full_name, d.name FROM employees e
INNER JOIN departments d ON e.department_id = d.id;   -- 3 rows, no Dũng

SELECT e.full_name, d.name FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;    -- 4 rows, Dũng paired with NULL
```

**Giải thích:** INNER JOIN chỉ giữ dòng khớp ở cả hai bảng; LEFT JOIN giữ mọi dòng bảng trái, bên phải không khớp thì điền NULL. Kết quả mọi loại JOIN trên dữ liệu mẫu:

| Loại JOIN | Kết quả (employees trái, departments phải) |
|---|---|
| INNER | An–IT, Bình–IT, Chi–HR |
| LEFT | 3 dòng trên + Dũng–NULL |
| RIGHT | 3 dòng INNER + NULL–Sales |
| FULL OUTER | 3 dòng INNER + Dũng–NULL + NULL–Sales (MySQL không hỗ trợ) |
| CROSS | 4 × 3 = 12 dòng, mọi cặp |

### Từng loại JOIN với bảng kết quả

Cách dễ hình dung JOIN: DB lấy từng dòng của bảng trái, đi tìm các dòng bên phải thỏa `ON`, và ghép chúng thành một dòng dài hơn. Các loại JOIN chỉ khác nhau ở chỗ **làm gì với dòng không tìm được cặp**. Các bảng dưới là kết quả thật khi chạy trên hai bảng mẫu (tôi đã chạy lại bằng SQLite 3.51, bản hỗ trợ cả RIGHT và FULL JOIN).

**INNER JOIN**: dòng nào không có cặp thì bỏ. Dũng (department_id NULL) và Sales (không ai trỏ tới) đều biến mất.

| full_name | name |
|---|---|
| An | IT |
| Bình | IT |
| Chi | HR |

**LEFT JOIN** (`employees e LEFT JOIN departments d`): giữ mọi dòng bảng trái. Dũng không có phòng nên cột `d.name` là NULL. Dùng khi câu hỏi là "liệt kê **tất cả** nhân viên, kèm phòng nếu có".

| full_name | name |
|---|---|
| An | IT |
| Bình | IT |
| Chi | HR |
| Dũng | NULL |

**RIGHT JOIN**: ngược lại, giữ mọi dòng bảng phải. Sales không có ai nên `full_name` là NULL. Trong thực tế người ta hầu như luôn đảo thứ tự bảng và viết LEFT JOIN cho dễ đọc.

| full_name | name |
|---|---|
| An | IT |
| Bình | IT |
| Chi | HR |
| NULL | Sales |

**FULL OUTER JOIN**: giữ mọi dòng của cả hai phía, gồm cả Dũng–NULL và NULL–Sales. MySQL không có cú pháp này; cách thay thế là `LEFT JOIN ... UNION ... RIGHT JOIN`.

| full_name | name |
|---|---|
| An | IT |
| Bình | IT |
| Chi | HR |
| Dũng | NULL |
| NULL | Sales |

**CROSS JOIN**: không có `ON`, ghép mọi dòng trái với mọi dòng phải: An–IT, An–HR, An–Sales, Bình–IT... tổng cộng 4 × 3 = 12 dòng. Hiếm khi dùng có chủ đích; nếu quên điều kiện `ON` trong cú pháp cũ `FROM a, b` thì bạn vô tình có CROSS JOIN, bảng 10 nghìn dòng ghép bảng 10 nghìn dòng ra 100 triệu dòng.

GROUP BY gom dòng cùng giá trị thành nhóm để tính `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.

### GROUP BY: dữ liệu trước và sau khi gom nhóm

Hãy hình dung GROUP BY như chia bài vào các chồng theo một cột, rồi mỗi chồng chỉ còn lại **một** dòng tóm tắt. Trước khi gom, bảng `employees` sắp theo `department_id`:

| department_id | full_name | salary |
|---|---|---|
| NULL | Dũng | 1000 |
| 1 | An | 2000 |
| 1 | Bình | 1500 |
| 2 | Chi | 1200 |

Chạy `SELECT department_id, COUNT(*), SUM(salary), AVG(salary) FROM employees GROUP BY department_id` thì bốn dòng thành ba nhóm. NULL cũng tạo thành một nhóm riêng:

| department_id | COUNT(*) | SUM(salary) | AVG(salary) |
|---|---|---|---|
| NULL | 1 | 1000 | 1000 |
| 1 | 2 | 3500 | 1750 |
| 2 | 1 | 1200 | 1200 |

Sau khi gom, cột `full_name` không còn ý nghĩa ở mức nhóm (nhóm 1 có cả An lẫn Bình, lấy tên nào?). Vì thế quy tắc là: cột trong SELECT phải nằm trong GROUP BY hoặc nằm trong hàm tổng hợp. Câu hỏi "Tìm lỗi" cuối mục có ví dụ vi phạm.

```sql
SELECT d.name, COUNT(e.id) AS headcount, AVG(e.salary) AS avg_salary
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
WHERE d.budget >= 20000        -- filter ROWS before grouping
GROUP BY d.name
HAVING COUNT(e.id) >= 1;       -- filter GROUPS after grouping
```

**Giải thích:** kết quả là IT (2 người, trung bình 1750) và HR (1, 1200); Sales có 0 người nên bị HAVING loại. Phải dùng `COUNT(e.id)`: với LEFT JOIN, Sales vẫn có một dòng mà cột của `e` đều NULL; `COUNT(*)` đếm dòng đó thành 1, còn `COUNT(cột)` bỏ qua NULL nên ra 0. Trên bảng `employees`: `COUNT(*)` ra 4, `COUNT(department_id)` ra 3, `COUNT(DISTINCT department_id)` ra 2.

Theo từng bước, câu trên chạy như sau: (1) `FROM ... LEFT JOIN` tạo 4 dòng An–IT, Bình–IT, Chi–HR, NULL–Sales; (2) `WHERE d.budget >= 20000` giữ cả 4 vì ba phòng đều đạt; (3) `GROUP BY d.name` tạo ba nhóm IT, HR, Sales; (4) tính `COUNT(e.id)`: IT 2, HR 1, Sales 0; (5) `HAVING` loại Sales; (6) `SELECT` in ra hai dòng.

### Câu hỏi (Hiểu sâu): WHERE khác HAVING thế nào?

WHERE lọc từng dòng trước khi gom nhóm nên không dùng được hàm tổng hợp; HAVING lọc nhóm sau `GROUP BY`. Điều kiện không liên quan aggregate nên đặt ở WHERE để giảm dữ liệu sớm. Thứ tự thực thi logic đầy đủ ở Chương 6.

> [!TRAP]
> Đặt điều kiện trên bảng bên phải của LEFT JOIN vào WHERE (ví dụ `WHERE e.salary > 1000`) sẽ loại các dòng NULL, biến LEFT JOIN thành INNER JOIN. Muốn giữ phòng không có ai, đặt điều kiện vào `ON`.

### Câu hỏi (Cơ bản): Khi nào dùng INNER JOIN, khi nào dùng LEFT JOIN?

**Nhìn vào câu hỏi nghiệp vụ: nếu cần "tất cả X, kèm Y nếu có" thì LEFT JOIN; nếu chỉ cần "những X có Y" thì INNER JOIN.** "Danh sách mọi nhân viên kèm tên phòng" phải là LEFT JOIN, vì INNER JOIN làm mất Dũng, và báo cáo nhân sự thiếu người là bug thật. "Doanh thu theo phòng của những phòng có nhân viên" thì INNER JOIN là đủ. Một mẹo kiểm tra: đếm số dòng bảng chính trước và sau khi JOIN; bị hụt mà không cố ý tức là đã chọn sai loại.

### Câu hỏi (Đọc code): Với hai bảng mẫu, câu dưới trả về gì?

```sql
SELECT d.name, COUNT(*) AS cnt
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.name;
```

Dữ liệu: `departments` gồm IT (id 1), HR (id 2), Sales (id 3); `employees` gồm An (phòng 1), Bình (phòng 1), Chi (phòng 2), Dũng (NULL).

**Đáp án:**

Ba dòng: IT 2, HR 1, **Sales 1** (thứ tự dòng tùy DB vì không có ORDER BY).

| name | cnt |
|---|---|
| HR | 1 |
| IT | 2 |
| Sales | 1 |

Sales không có ai nhưng vẫn ra 1, vì LEFT JOIN sinh cho Sales một dòng với các cột của `e` là NULL, và `COUNT(*)` đếm **dòng** chứ không đếm giá trị. Đổi thành `COUNT(e.id)` thì Sales ra 0 đúng như mong đợi. Dũng không xuất hiện vì bảng chính là `departments`.

### Câu hỏi (Đọc code): Hai câu dưới khác nhau ở đâu, mỗi câu trả mấy dòng?

```sql
-- Query A
SELECT d.name, e.full_name FROM departments d
LEFT JOIN employees e ON e.department_id = d.id AND e.salary > 1400;

-- Query B
SELECT d.name, e.full_name FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
WHERE e.salary > 1400;
```

**Đáp án:**

A trả 4 dòng, B trả 2 dòng, dù chỉ dời điều kiện từ `ON` sang `WHERE`.

- A: điều kiện nằm trong `ON` nên chỉ ảnh hưởng việc **ghép cặp**; phòng nào không tìm được người lương trên 1400 vẫn được giữ với NULL. Kết quả: IT–An, IT–Bình, HR–NULL, Sales–NULL.
- B: LEFT JOIN tạo IT–An, IT–Bình, HR–Chi, Sales–NULL, rồi `WHERE` lọc tiếp. Chi có 1200 bị loại; Sales có `e.salary` NULL, `NULL > 1400` là UNKNOWN nên cũng bị loại. Còn IT–An, IT–Bình: LEFT JOIN đã bị biến thành INNER JOIN.

### Câu hỏi (Đọc code): Câu SQL dưới sai ở đâu?

```sql
SELECT department_id, full_name, COUNT(*)
FROM employees
GROUP BY department_id;
```

**Đáp án:**

**`full_name` không nằm trong GROUP BY và cũng không nằm trong hàm tổng hợp**, nên nhóm phòng 1 có hai giá trị An và Bình mà DB không biết in giá trị nào. PostgreSQL báo `column "employees.full_name" must appear in the GROUP BY clause or be used in an aggregate function`; MySQL 5.7+ bật mặc định `ONLY_FULL_GROUP_BY` nên cũng báo lỗi. MySQL đời cũ tắt chế độ này thì trả một tên ngẫu nhiên, còn nguy hiểm hơn. Sửa tùy ý định: bỏ `full_name`, hoặc dùng `MAX(full_name)`, hoặc `STRING_AGG(full_name, ', ')` (PostgreSQL) / `GROUP_CONCAT(full_name)` (MySQL) để liệt kê tên trong nhóm.

## N2.3 Subquery, EXISTS và các bài SQL kinh điển

**Subquery** (truy vấn con) là một câu SELECT nằm bên trong câu SELECT khác, đặt trong ngoặc. DB chạy câu con để lấy một giá trị hoặc một danh sách, rồi dùng kết quả đó cho câu ngoài. Có hai loại cần phân biệt: subquery **độc lập** chạy một lần (ví dụ tính lương trung bình công ty), và subquery **tương quan** (correlated) tham chiếu cột của câu ngoài nên về mặt logic chạy lại cho từng dòng ngoài (ví dụ `NOT EXISTS` dưới đây dùng `d.id`).

Đoạn dưới gồm một subquery vô hướng và cái bẫy kinh điển của `NOT IN`.

```sql
-- Salary above company average (AVG = 1425): An, Bình
SELECT full_name FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Departments with nobody: NOT IN returns EMPTY because the subquery contains Dũng's NULL
SELECT name FROM departments
WHERE id NOT IN (SELECT department_id FROM employees);

-- Correct version with NOT EXISTS: Sales
SELECT d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id);
```

**Giải thích:** `3 NOT IN (1, 1, 2, NULL)` tương đương `3 <> 1 AND 3 <> 2 AND 3 <> NULL`; vế cuối là UNKNOWN nên điều kiện không bao giờ TRUE. `EXISTS` chỉ hỏi "có ít nhất một dòng không" nên không bị NULL ảnh hưởng. Đây là ý chính khi bị hỏi EXISTS khác IN: `IN` so với danh sách giá trị, `EXISTS` kiểm tra sự tồn tại của dòng; hiệu năng trên MySQL 8, PostgreSQL thường ngang nhau vì optimizer chuyển cả hai về semi-join.

Nếu vẫn muốn dùng `NOT IN`, phải tự loại NULL khỏi danh sách con. Bản sửa dưới trả đúng Sales (đã chạy thử trên SQLite):

```sql
SELECT name FROM departments
WHERE id NOT IN (SELECT department_id FROM employees
                 WHERE department_id IS NOT NULL);   -- remove NULL first
```

**Giải thích:** danh sách con giờ là `(1, 1, 2)`, `3 NOT IN (1, 1, 2)` là TRUE nên Sales được giữ. Cách này đúng nhưng dễ quên khi cột sau này được đổi thành cho phép NULL; `NOT EXISTS` an toàn hơn vì không phụ thuộc vào việc cột có NULL hay không.

Tìm bản ghi trùng gần như luôn có trong vòng Fresher. Giả sử cột `full_name` chưa có UNIQUE:

```sql
SELECT full_name, COUNT(*) AS cnt
FROM employees
GROUP BY full_name
HAVING COUNT(*) > 1;          -- keep only groups appearing 2+ times
```

**Giải thích:** mỗi giá trị trùng trả về một dòng kèm số lần xuất hiện (dữ liệu mẫu chưa có trùng nên rỗng). Muốn lấy đủ các dòng bị trùng, đưa câu này vào `WHERE full_name IN (...)`. Cách xóa trùng giữ một dòng bằng `ROW_NUMBER()` ở Chương 6.

> [!NOTE]
> Tài liệu cũ đếm trùng bằng `COUNT(col) - COUNT(DISTINCT col)`. Con số đó chỉ là số dòng "thừa", không cho biết giá trị nào trùng. Người phỏng vấn muốn thấy `GROUP BY ... HAVING`.

Lương cao thứ hai: nên biết ít nhất hai cách.

```sql
-- Option 1: works on every DB
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);            -- 1500

-- Option 2: window function (MySQL 8+, PostgreSQL), change 2 to N for the Nth
SELECT DISTINCT salary FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
) t WHERE rnk = 2;
```

**Giải thích:** cả hai ra 1500. `DENSE_RANK` xếp đồng hạng không nhảy số (2000, 2000, 1500 có hạng 1, 1, 2), nên đúng cả khi nhiều người cùng lương cao nhất. Cách thứ ba là `SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET 1`; thiếu `DISTINCT` thì sai khi có lương trùng.

Để thấy vì sao `DISTINCT` quan trọng, giả sử thêm nhân viên Giang cũng lương 2000. Cột `salary` sắp giảm dần là 2000, 2000, 1500, 1200, 1000. Không có `DISTINCT`, `LIMIT 1 OFFSET 1` bỏ dòng đầu và lấy dòng thứ hai là **2000**, sai. Có `DISTINCT`, danh sách còn 2000, 1500, 1200, 1000 nên lấy được **1500**, đúng.

**View** là câu SELECT được đặt tên, dùng như bảng ảo (`CREATE VIEW v_emp AS SELECT ...`); thường không lưu dữ liệu, mỗi lần đọc DB chạy lại câu gốc. Dùng để che JOIN phức tạp và chỉ cấp quyền trên cột cần thiết. **UNION** nối hai tập kết quả và khử trùng (tốn sắp xếp hoặc băm), **UNION ALL** giữ nguyên nên nhanh hơn.

### Câu hỏi (Cơ bản): DELETE, TRUNCATE và DROP khác nhau thế nào?

DELETE là DML, xóa từng dòng, có WHERE, chạy trigger, rollback được. TRUNCATE là DDL, xóa toàn bộ dữ liệu rất nhanh, không WHERE, thường reset auto increment. DROP xóa cả bảng lẫn cấu trúc, index, constraint. Khác biệt giữa MySQL và PostgreSQL (TRUNCATE của PostgreSQL rollback được) ở Chương 6.

### Câu hỏi (Đọc code): Câu dưới trả về những ai?

```sql
SELECT full_name FROM employees WHERE department_id <> 1;
```

Dữ liệu: An (phòng 1), Bình (phòng 1), Chi (phòng 2), Dũng (department_id NULL).

**Đáp án:**

**Chỉ Chi.** Nhiều người trả lời "Chi và Dũng" vì nghĩ Dũng "không thuộc phòng 1". Nhưng `NULL <> 1` cho UNKNOWN, WHERE chỉ giữ TRUE, nên Dũng bị loại. Muốn lấy cả người chưa có phòng: `WHERE department_id <> 1 OR department_id IS NULL`. PostgreSQL còn có `IS DISTINCT FROM 1` coi NULL là một giá trị so sánh được.

### Câu hỏi (Hiểu sâu): Vì sao `NOT IN` với subquery có NULL trả về rỗng, còn `IN` thì không bị ảnh hưởng?

**Vì `NOT IN` là chuỗi AND của các phép `<>`, chỉ cần một vế UNKNOWN là cả chuỗi không thể TRUE; còn `IN` là chuỗi OR, một vế TRUE là đủ.** `1 IN (1, NULL)` là `1 = 1 OR 1 = NULL` = TRUE OR UNKNOWN = TRUE. `3 NOT IN (1, NULL)` là `3 <> 1 AND 3 <> NULL` = TRUE AND UNKNOWN = UNKNOWN. Vì thế lỗi chỉ lộ ra ở `NOT IN`, và thường chỉ lộ ra trên production, khi lần đầu tiên có một dòng NULL chen vào cột đó.

### Câu hỏi (Đọc code): Câu dưới dùng để làm gì, và trả về gì trên dữ liệu mẫu?

```sql
SELECT e.full_name, e.salary
FROM employees e
WHERE e.salary = (SELECT MAX(x.salary) FROM employees x
                  WHERE x.department_id = e.department_id);
```

**Đáp án:**

**Câu này tìm người lương cao nhất của từng phòng, dùng subquery tương quan; kết quả là An (2000) và Chi (1200).** Với mỗi dòng ngoài `e`, subquery tính lương cao nhất của phòng mà `e` thuộc về: An so với MAX phòng 1 = 2000, khớp; Bình 1500 không khớp; Chi so với MAX phòng 2 = 1200, khớp. Dũng bị loại vì `x.department_id = NULL` không khớp dòng nào, subquery trả NULL, `1000 = NULL` là UNKNOWN. Nếu hai người cùng lương cao nhất phòng thì cả hai cùng xuất hiện. Cách viết hiện đại hơn là window function `RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)` (Chương 6).

### Câu hỏi (Cơ bản): UNION khác UNION ALL thế nào, nên mặc định dùng cái nào?

**UNION khử dòng trùng nên phải sắp xếp hoặc băm toàn bộ kết quả; UNION ALL giữ nguyên nên nhanh hơn.** Ví dụ `SELECT 'IT' UNION SELECT 'IT'` ra 1 dòng, còn `UNION ALL` ra 2 dòng. Tôi mặc định dùng UNION ALL, chỉ dùng UNION khi thật sự cần khử trùng và hiểu cái giá phải trả. Cả hai đều yêu cầu hai vế có cùng số cột và kiểu tương thích; tên cột lấy theo vế đầu.

## N2.4 Index, chuẩn hóa và transaction

**Index** giống mục lục sách: thay vì quét toàn bảng, DB tra cây B+Tree để nhảy thẳng tới dòng cần tìm, ví dụ `CREATE INDEX idx_emp_dept ON employees (department_id)`. Primary key và unique tự có index; MySQL InnoDB tự index cột foreign key, PostgreSQL thì **không**. Nên index cột hay nằm trong WHERE, JOIN, ORDER BY trên bảng lớn; không index tràn lan vì mỗi lần ghi phải cập nhật mọi index. Composite index, EXPLAIN ở Chương 6.

### Index qua ví dụ mục lục sách

Hãy tưởng tượng một cuốn sách 800 trang và bạn cần tìm trang nói về "HashMap". Không có mục lục, bạn phải lật từng trang từ đầu tới cuối: đó là **full table scan**. Có mục lục sắp theo vần, bạn tra chữ H, thấy "HashMap: trang 312", lật thẳng tới đó: đó là **index lookup**. Ba điểm của phép so sánh này ứng đúng với index trong DB:

- Mục lục là một cấu trúc **riêng**, nằm ngoài nội dung sách, và chiếm thêm giấy. Index cũng chiếm thêm dung lượng đĩa.
- Mục lục được **sắp xếp** nên tra nhanh. Index B+Tree cũng giữ các giá trị theo thứ tự, nên tìm một giá trị trong một triệu dòng chỉ mất vài bước nhảy qua các tầng của cây thay vì một triệu phép so sánh.
- Sửa nội dung sách thì phải sửa cả mục lục. Mỗi `INSERT`, `UPDATE`, `DELETE` cũng phải cập nhật mọi index liên quan, nên bảng có quá nhiều index sẽ ghi chậm.

Bạn có thể tự thấy khác biệt bằng lệnh xem kế hoạch thực thi. Đoạn dưới chạy trên SQLite (MySQL, PostgreSQL dùng `EXPLAIN`, output khác định dạng nhưng cùng ý):

```sql
EXPLAIN QUERY PLAN SELECT * FROM employees WHERE department_id = 1;
-- output: SCAN employees                   (reads every row)

CREATE INDEX idx_emp_dept ON employees (department_id);

EXPLAIN QUERY PLAN SELECT * FROM employees WHERE department_id = 1;
-- output: SEARCH employees USING INDEX idx_emp_dept (department_id=?)
```

**Giải thích:** trước khi có index, DB chỉ còn cách **SCAN** (đọc hết bảng). Sau khi tạo index, kế hoạch đổi thành **SEARCH ... USING INDEX**: tra cây để lấy đúng các dòng phòng 1. Với bốn dòng thì không thấy khác biệt thời gian, nhưng với vài triệu dòng đây là khác biệt giữa vài mili giây và vài giây. Index giúp khi điều kiện **lọc được ít dòng**; cột chỉ có hai giá trị như `gender` thường không đáng index vì đằng nào cũng phải đọc nửa bảng.

**Chuẩn hóa** tách bảng để mỗi thông tin chỉ lưu một chỗ. Bảng dưới gộp mọi thứ vào một nơi:

```text
employee_id | project_id | employee_name | phones     | dept_id | dept_name
1           | 10         | An            | 0901, 0902 | 1       | IT
1           | 11         | An            | 0901, 0902 | 1       | IT
```

**Giải thích:** bảng vi phạm cả ba dạng chuẩn:

- **1NF** (giá trị nguyên tố): ô `phones` chứa nhiều số. Sửa: tách bảng `employee_phones`.
- **2NF** (không phụ thuộc một phần khóa): khóa là `(employee_id, project_id)` nhưng `employee_name` chỉ phụ thuộc `employee_id`, nên tên lặp ở mọi dự án. Sửa: đưa tên về bảng `employees`.
- **3NF** (không phụ thuộc bắc cầu): `dept_name` phụ thuộc `dept_id` chứ không phụ thuộc nhân viên. Sửa: tách `departments`, chính là schema ở N2.1.

Vì sao dữ liệu lặp lại là vấn đề, chứ không chỉ tốn chỗ? Vì nó sinh ra **bất thường khi cập nhật**. Đổi tên phòng IT thành "Công nghệ" trên bảng gộp phải sửa mọi dòng có `dept_id = 1`; sót một dòng là DB chứa hai tên khác nhau cho cùng một phòng, và không ai biết tên nào đúng. Sau khi chuẩn hóa, tên phòng chỉ nằm một chỗ trong `departments`, sửa một dòng là xong. Trade-off: càng chuẩn hóa càng nhiều JOIN khi đọc; báo cáo nặng đôi khi cố ý phi chuẩn hóa (denormalize) để đọc nhanh.

**Transaction** gom nhiều lệnh thành một đơn vị: tất cả thành công hoặc không lệnh nào có hiệu lực.

```sql
START TRANSACTION;       -- PostgreSQL uses BEGIN; MySQL accepts both
UPDATE employees   SET salary = salary + 500 WHERE id = 2;
UPDATE departments SET budget = budget - 500 WHERE id = 1;
COMMIT;                  -- if one statement fails: ROLLBACK undoes both
```

**Giải thích:** nếu lệnh thứ hai lỗi (ví dụ vi phạm `CHECK (budget >= 0)`) và ứng dụng gọi `ROLLBACK`, lương của Bình cũng trở về như cũ; không có transaction, lương đã tăng mà ngân sách chưa trừ. Trong Spring, `@Transactional` làm việc này. ACID mỗi chữ một câu:

- **Atomicity**: tất cả hoặc không gì cả.
- **Consistency**: trước và sau transaction, dữ liệu luôn thỏa mọi ràng buộc.
- **Isolation**: transaction đồng thời không thấy trạng thái dở dang của nhau, mức độ do isolation level quyết định (Chương 6).
- **Durability**: đã commit thì không mất, kể cả khi sập nguồn ngay sau đó.

### Kịch bản chuyển tiền từng bước

Ví dụ kinh điển nhất để hiểu transaction là chuyển khoản. Bảng `accounts` có An 1000 và Bình 500, ràng buộc `CHECK (balance >= 0)`. An chuyển 300 cho Bình, cần hai lệnh: trừ tiền An và cộng tiền Bình. Trước hết là bản **sai**: chạy hai lệnh ở chế độ autocommit, tức mỗi lệnh tự commit ngay khi chạy xong (đây là mặc định của MySQL, PostgreSQL và JDBC).

```sql
-- Wrong: autocommit, each statement is committed on its own
UPDATE accounts SET balance = balance - 300 WHERE id = 1;  -- committed: An = 700
-- server crashes / app throws here
UPDATE accounts SET balance = balance + 300 WHERE id = 2;  -- never runs: Bình still 500
```

**Giải thích:** lệnh đầu đã commit nên An mất 300, lệnh sau không bao giờ chạy nên Bình không nhận được gì. Tổng tiền trong hệ thống từ 1500 thành 1200: 300 "bốc hơi". Không có lỗi nào được báo cho người dùng biết tiền đi đâu. Bản đúng bọc cả hai lệnh vào một transaction:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 300 WHERE id = 1;  -- An = 700, visible only in this tx
UPDATE accounts SET balance = balance + 300 WHERE id = 2;  -- Bình = 800
COMMIT;                                                    -- both changes become permanent together
```

**Giải thích:** diễn biến từng bước như sau.

1. `BEGIN` mở transaction. Từ đây mọi thay đổi là "bản nháp" của riêng transaction này.
2. Lệnh trừ tiền chạy: trong transaction An còn 700, nhưng transaction khác vẫn thấy An 1000 (Isolation).
3. Lệnh cộng tiền chạy: Bình 800.
4. `COMMIT`: cả hai thay đổi cùng lúc trở thành chính thức và được ghi bền xuống đĩa (Durability). Tổng tiền vẫn là 1500 (Consistency).
5. Nếu sập giữa bước 2 và 4, khi DB khởi động lại transaction chưa commit sẽ bị hủy, An vẫn 1000, Bình vẫn 500 (Atomicity).

Tôi đã chạy thử trên SQLite một lần chuyển 900 từ An (lúc đó còn 700) với lệnh cộng tiền Bình chạy trước: lệnh trừ tiền An vi phạm `CHECK (balance >= 0)`, transaction không được commit, và số dư của **cả hai** giữ nguyên 700 và 800. Lưu ý: khi một lệnh lỗi, DB không tự rollback cả transaction trong mọi trường hợp (MySQL chỉ hủy câu lệnh lỗi); ứng dụng phải gọi `ROLLBACK`, và đó chính là việc `@Transactional` của Spring làm khi method ném exception.

### Câu hỏi (Cơ bản): Index là gì? Vì sao không đánh index cho mọi cột cho nhanh?

**Index là cấu trúc dữ liệu phụ, thường là B+Tree, giúp DB tìm dòng theo giá trị cột mà không phải quét cả bảng, giống mục lục sách.** Không index mọi cột vì: mỗi index tốn dung lượng; mỗi lần ghi phải cập nhật mọi index nên `INSERT`/`UPDATE` chậm đi; và optimizer có thể bỏ qua index trên cột ít giá trị khác nhau. Nguyên tắc: index cột xuất hiện trong WHERE, JOIN, ORDER BY của những câu chạy thường xuyên trên bảng lớn, rồi kiểm chứng bằng EXPLAIN.

### Câu hỏi (Thực chiến): API danh sách nhân viên theo phòng chạy nhanh trên máy dev nhưng mất 4 giây trên production. Bạn điều tra thế nào?

**Tôi lấy câu SQL thật đang chạy, chạy EXPLAIN trên production (hoặc bản sao dữ liệu) và xem nó có quét toàn bảng không.** Máy dev có vài trăm dòng nên full scan vẫn nhanh; production có vài triệu dòng mới lộ. Các bước:

- Bật log SQL hoặc xem slow query log để lấy câu thật, ví dụ `SELECT ... FROM employees WHERE department_id = ?`.
- EXPLAIN: thấy full scan (MySQL `type: ALL`, PostgreSQL `Seq Scan`) trên cột `department_id` tức là thiếu index. Trên PostgreSQL, cột foreign key không tự có index nên rất hay gặp.
- Tạo index, chạy lại EXPLAIN để xác nhận đã dùng index, đo lại thời gian.
- Kiểm tra thêm N+1 query ở tầng JPA (N2.11) vì một API chậm đôi khi là 500 câu nhỏ chứ không phải một câu lớn.

### Câu hỏi (Đọc code): Đoạn chuyển tiền dưới dùng JDBC có vấn đề gì?

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class TransferDao {
    void transfer(Connection conn) throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("UPDATE accounts SET balance = balance - 300 WHERE id = 1");
            st.executeUpdate("UPDATE accounts SET balance = balance + 300 WHERE id = 2");
        }
    }
}
```

**Đáp án:**

**JDBC mặc định bật autocommit, nên hai câu UPDATE là hai transaction riêng; câu hai lỗi thì câu một đã commit và tiền bị mất.** Sửa bằng cách gọi `conn.setAutoCommit(false)` trước, `conn.commit()` sau khi cả hai chạy xong, và `conn.rollback()` trong `catch`. Trong Spring bạn không viết tay các lệnh này mà đặt `@Transactional` lên method service; Spring mở transaction, commit khi method kết thúc bình thường và rollback khi method ném `RuntimeException`.

### Câu hỏi (Hiểu sâu): Bảng `orders(order_id, product_id, customer_name, customer_phone)` vi phạm dạng chuẩn nào?

**Vi phạm 3NF: `customer_phone` phụ thuộc vào `customer_name` (thực chất là khách hàng), không phụ thuộc trực tiếp vào đơn hàng.** Cùng một khách đặt 50 đơn thì số điện thoại lặp 50 lần; đổi số phải sửa 50 dòng. Sửa: tạo bảng `customers(id, name, phone)`, `orders` chỉ giữ `customer_id` làm foreign key. Nếu khóa chính của `orders` là `(order_id, product_id)` thì `customer_name` chỉ phụ thuộc `order_id`, tức là vi phạm cả 2NF; khi đó cần tách thêm bảng `order_items`.

### Câu hỏi (Hiểu sâu): Chữ "C" trong ACID liên quan gì tới các ràng buộc ở N2.1?

**Consistency nghĩa là transaction đưa DB từ một trạng thái hợp lệ sang một trạng thái hợp lệ khác, và "hợp lệ" được định nghĩa một phần bởi các ràng buộc `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`.** Khi một lệnh trong transaction vi phạm ràng buộc (ví dụ `CHECK (balance >= 0)` ở kịch bản chuyển tiền), DB từ chối lệnh đó, ứng dụng rollback, và DB không bao giờ lưu trạng thái vi phạm luật. Phần còn lại của Consistency là luật nghiệp vụ (tổng tiền không đổi sau chuyển khoản) mà DB không tự biết, ứng dụng phải đảm bảo bằng cách gom đúng các lệnh vào cùng transaction.

## N2.5 Web cơ bản: HTTP, cookie, session

HTTP là giao thức hỏi–đáp: client gửi request, server trả response. Dưới đây là một cặp request/response khi tạo nhân viên qua REST API.

```text
POST /api/employees HTTP/1.1
Host: hr.corp.vn
Content-Type: application/json

{"fullName": "Em", "email": "em@corp.vn", "salary": 1300}

HTTP/1.1 201 Created
Location: /api/employees/5
Content-Type: application/json

{"id": 5, "fullName": "Em", ...}
```

**Giải thích:** request gồm dòng đầu (method, đường dẫn, phiên bản), các header (metadata như kiểu nội dung, token), một dòng trống, rồi body. Response gồm status line, header và body; `Location` chỉ địa chỉ tài nguyên vừa tạo.

Thêm một ví dụ đọc dữ liệu, lần này là request GET tới một nhân viên không tồn tại. Đây chính là thứ bạn thấy khi mở tab Network của trình duyệt hoặc chạy `curl -v`:

```text
GET /api/employees/99 HTTP/1.1
Host: hr.corp.vn
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

HTTP/1.1 404 Not Found
Content-Type: application/json
Content-Length: 34

{"error": "Employee 99 not found"}
```

**Giải thích:** GET không có body; tham số nằm trên đường dẫn (`/99`) hoặc query string (`?page=0`). Header `Accept` nói client muốn nhận JSON, `Authorization` mang token đăng nhập. Server trả status 404 kèm body giải thích lỗi. Điểm cần nhớ: status code là thứ **máy** đọc để quyết định (retry, báo lỗi, chuyển trang), còn body là thứ **người** đọc; trả 200 kèm `{"error": ...}` là thiết kế sai vì client tưởng đã thành công.

| Nhóm | Ý nghĩa | Ví dụ |
|---|---|---|
| 1xx | Thông tin | 101 Switching Protocols |
| 2xx | Thành công | 200 OK, 201 Created, 204 No Content |
| 3xx | Chuyển hướng | 301, 302, 304 Not Modified |
| 4xx | Lỗi phía client | 400, 401, 403, 404, 409 |
| 5xx | Lỗi phía server | 500, 502, 503 |

HTTP là **stateless**: server không nhớ gì giữa hai request. Để nhớ người dùng đã đăng nhập, **cookie** là dữ liệu nhỏ (khoảng 4KB) lưu ở trình duyệt, tự gửi kèm mọi request; **session** là dữ liệu lưu ở server, nhận diện bằng session id (`JSESSIONID`) nằm trong cookie. REST API thường gửi token (JWT) trong header `Authorization` thay cho session. **HTTPS** là HTTP chạy trên TLS (cổng 443): mã hóa dữ liệu, xác thực server bằng chứng chỉ, chống sửa nội dung. **JSON** gọn, map thẳng sang object nên là chuẩn của REST; **XML** dài hơn nhưng có schema (XSD), còn gặp ở SOAP.

### Stateless nghĩa là gì, và cookie/session giải quyết thế nào

"Stateless" (không trạng thái) nghĩa là mỗi request phải **tự mang đủ thông tin** để server xử lý, vì theo giao thức, server coi mỗi request như đến từ một người lạ. So sánh đời thường: gọi tổng đài mà mỗi lần gọi lại gặp một nhân viên khác, không ai nhớ bạn đã gọi trước đó; muốn được phục vụ tiếp bạn phải đọc lại mã khách hàng. Thiết kế này có lợi: server nào trong cụm cũng xử lý được mọi request, dễ mở rộng thêm máy. Nhưng nó đặt ra vấn đề: đăng nhập xong, làm sao request sau biết bạn là ai? Cookie và session chính là "mã khách hàng" đó:

```text
# 1) Login: server creates a session and returns its id in a cookie
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=an&password=secret

HTTP/1.1 302 Found
Set-Cookie: JSESSIONID=8F3A1C27B; Path=/; HttpOnly; Secure
Location: /home

# 2) Every later request: the browser attaches the cookie automatically
GET /api/me HTTP/1.1
Cookie: JSESSIONID=8F3A1C27B
```

**Giải thích:** từng bước như sau.

1. Đăng nhập đúng, server (Tomcat) tạo một **session**: một vùng nhớ phía server, kiểu `Map` chứa `user = an`, gắn với một id ngẫu nhiên khó đoán `8F3A1C27B`.
2. Server gửi id đó về qua header `Set-Cookie`. Trình duyệt lưu lại thành **cookie**.
3. Mọi request sau tới cùng domain, trình duyệt tự đính kèm `Cookie: JSESSIONID=...`.
4. Server tra id trong bộ nhớ session, thấy `user = an`, biết request này của An.

HTTP vẫn stateless; trạng thái được "gắn thêm" nhờ cookie. `HttpOnly` cấm JavaScript đọc cookie (chống đánh cắp qua XSS), `Secure` chỉ gửi cookie qua HTTPS. Nhược điểm của session: nằm trong RAM một server, chạy nhiều server thì phải dùng sticky session hoặc lưu session chung ở Redis. JWT đi hướng khác: nhét thông tin người dùng đã ký số vào token, server không cần lưu gì (Chương 5).

### Câu hỏi (Cơ bản): GET và POST khác nhau thế nào?

GET dùng để đọc, tham số nằm trên URL, là safe và idempotent, cache và bookmark được. POST dùng để tạo mới hoặc gửi lệnh, dữ liệu nằm trong body, không idempotent (gửi hai lần có thể tạo hai bản ghi). PUT, PATCH, DELETE và idempotency ở Chương 7.

> [!TRAP]
> "POST bảo mật hơn GET" chỉ đúng một phần: tham số GET lộ trong lịch sử trình duyệt và log, nhưng body POST qua HTTP vẫn là văn bản rõ. Bảo mật đường truyền đến từ HTTPS, không đến từ method.

### Câu hỏi (Hiểu sâu): HTTP là stateless, vậy vì sao đăng nhập một lần mà các trang sau vẫn biết tôi là ai?

**Vì mỗi request sau đều tự mang theo bằng chứng danh tính: cookie chứa session id, hoặc token trong header `Authorization`.** Server không "nhớ" kết nối; nó đọc session id trong cookie, tra kho session phía server để lấy thông tin người dùng. Với JWT, server kiểm tra chữ ký của token và đọc thông tin ngay trong token, không cần tra kho. Nói cách khác, trạng thái được đẩy ra ngoài giao thức: vào cookie, vào kho session, hoặc vào token.

> [!DEEP]
> Người phỏng vấn hay hỏi tiếp: "Chạy 3 instance sau load balancer, người dùng đăng nhập ở instance 1, request sau rơi vào instance 2 thì sao?" Session nằm trong RAM instance 1 nên instance 2 không thấy, người dùng bị đá ra. Cách giải: sticky session (load balancer luôn đưa cùng người về cùng instance), lưu session chung ở Redis (Spring Session), hoặc chuyển sang token stateless như JWT.

### Câu hỏi (Cơ bản): 401 khác 403 thế nào?

**401 Unauthorized nghĩa là "tôi chưa biết bạn là ai" (chưa đăng nhập hoặc token sai/hết hạn); 403 Forbidden nghĩa là "tôi biết bạn là ai, nhưng bạn không có quyền".** Nhân viên thường gọi API xóa nhân viên mà thiếu token thì nhận 401, đăng nhập lại là xong; có token hợp lệ nhưng không phải admin thì nhận 403, đăng nhập lại cũng vô ích. Tên "Unauthorized" của 401 là cách đặt tên lịch sử gây nhầm, ý đúng là "unauthenticated".

### Câu hỏi (Thực chiến): API tạo nhân viên trả 500 khi email bị trùng. Có vấn đề gì, nên sửa thế nào?

**500 báo "server hỏng" trong khi lỗi nằm ở dữ liệu client gửi lên; nên trả 409 Conflict (hoặc 400) kèm thông báo rõ ràng.** Trả 500 gây hai hậu quả: client không biết sửa gì, và hệ thống giám sát báo động giả vì 5xx thường bị coi là sự cố. Nguyên nhân thường là `DataIntegrityViolationException` từ ràng buộc UNIQUE không được bắt. Sửa: bắt exception đó (hoặc kiểm tra `existsByEmail` trước) và ánh xạ sang 409 trong `@RestControllerAdvice`, như ví dụ ở N2.8.

## N2.6 Từ Tomcat tới Controller

**Servlet container** (Tomcat, Jetty) nhận kết nối, phân tích HTTP thành `HttpServletRequest`/`HttpServletResponse`, lấy một thread trong pool rồi gọi Servlet. Spring Boot nhúng sẵn Tomcat nên chạy bằng `java -jar`. Luồng một request vào Spring MVC:

1. Tomcat nhận request, cho đi qua chuỗi Filter (Spring Security, logging).
2. **DispatcherServlet** (front controller của Spring MVC) tiếp nhận.
3. **HandlerMapping** tìm method controller khớp URL và HTTP method.
4. Tham số được chuẩn bị: **HttpMessageConverter** (Jackson) chuyển JSON body thành object, chạy validation, rồi gọi method.
5. Controller gọi Service, Service gọi Repository.
6. Object trả về được Jackson chuyển thành JSON; nếu có exception, `@ExceptionHandler` chuyển thành response lỗi.

Vài từ trong danh sách trên cần giải nghĩa cho người mới. **Servlet** là một class Java theo chuẩn Jakarta Servlet, có method nhận `HttpServletRequest` và ghi vào `HttpServletResponse`; container là chương trình chạy các servlet đó. **Front controller** nghĩa là mọi request đều đi qua **một** cửa duy nhất (DispatcherServlet), rồi cửa đó mới chia việc cho từng controller, giống lễ tân của tòa nhà chỉ đường cho khách. **Filter** là đoạn code chạy trước và sau servlet cho mọi request, hợp cho việc chung như ghi log, kiểm tra token.

> [!RECALL]
> Tomcat xử lý nhiều request cùng lúc bằng một **thread pool** (mặc định tối đa 200 thread trong Spring Boot): mỗi request được một thread lấy từ pool chạy từ đầu tới cuối. Thread và chạy song song xem N1.13. Hệ quả: controller, service là singleton dùng chung cho mọi thread, nên không được giữ dữ liệu của từng request trong field.

### Theo dấu một request cụ thể

Lấy request `GET /api/employees/5` gửi tới controller ở N2.8. Theo từng bước:

1. Tomcat nhận kết nối TCP trên cổng 8080, đọc các byte HTTP, tạo object `HttpServletRequest` với method `GET`, path `/api/employees/5`.
2. Tomcat lấy một thread rảnh trong pool, ví dụ `http-nio-8080-exec-3`, giao cho nó xử lý request này.
3. Request đi qua các Filter. Nếu có Spring Security, filter kiểm tra token; token sai thì trả 401 ngay tại đây, không bao giờ tới controller.
4. DispatcherServlet nhận request, hỏi HandlerMapping: "ai xử lý `GET /api/employees/{id}`?". Câu trả lời là method `EmployeeController.get(Long id)`.
5. Spring đọc `5` từ đường dẫn, chuyển chuỗi `"5"` thành `Long` 5 cho tham số `@PathVariable Long id`.
6. Method chạy: controller gọi `service.get(5)`, service gọi `repo.findById(5)`, Hibernate chạy `SELECT ... WHERE id = ?`.
7. Method trả object `Employee`. Vì là `@RestController`, Jackson chuyển object thành JSON `{"id":5,...}`, ghi vào body với status 200.
8. Nếu không tìm thấy, service ném `EmployeeNotFoundException`; DispatcherServlet tìm `@ExceptionHandler` phù hợp và trả 404.
9. Response đi ngược lại qua các Filter, Tomcat gửi byte về client, thread `exec-3` trở về pool chờ request khác.

**MVC** tách ứng dụng thành Model (dữ liệu), View (hiển thị), Controller (nhận request, điều phối). Với `@Controller`, method trả `"home"` được hiểu là tên view, ViewResolver tìm template `home.html` để render HTML. `@RestController` bằng `@Controller` cộng `@ResponseBody` trên mọi method, nên giá trị trả về được Jackson ghi thẳng vào body dưới dạng JSON; đó là lựa chọn cho REST API.

### Câu hỏi (Cơ bản): REST khác SOAP thế nào?

SOAP là giao thức với định dạng XML bắt buộc (envelope), mô tả dịch vụ bằng WSDL, có chuẩn mở rộng như WS-Security. REST là phong cách kiến trúc trên HTTP: tài nguyên định danh bằng URL, thao tác bằng HTTP method, dữ liệu thường là JSON, nhẹ. SOAP còn gặp trong tích hợp ngân hàng, cơ quan nhà nước.

> [!TRAP]
> Tài liệu cũ nói "SOAP có sẵn ACID". Sai: SOAP không tự đảm bảo transaction; giao dịch phân tán qua SOAP cần chuẩn riêng (WS-AtomicTransaction) và rất ít được dùng.

### Câu hỏi (Cơ bản): DispatcherServlet là gì, nó làm gì trong một request?

**DispatcherServlet là front controller của Spring MVC: servlet duy nhất nhận mọi request rồi điều phối tới đúng method controller.** Nó hỏi HandlerMapping để tìm method, nhờ các converter chuẩn bị tham số (đọc path, query, JSON body), gọi method, rồi chuyển giá trị trả về thành response (JSON hoặc view HTML), và chuyển exception thành response lỗi qua `@ExceptionHandler`. Nhờ nó, controller của bạn chỉ là class bình thường có annotation, không phải kế thừa `HttpServlet`.

### Câu hỏi (Đọc code): Endpoint dưới được gọi thì nhận về gì?

```java
@Controller
@RequestMapping("/api/ping")
public class PingController {
    @GetMapping
    public String ping() {
        return "pong";
    }
}
```

**Đáp án:**

**Không nhận được chuỗi `pong` mà nhận lỗi, vì `@Controller` hiểu `"pong"` là tên view.** Spring đi tìm template `pong` (ví dụ `templates/pong.html` với Thymeleaf); không có thì báo lỗi, thường là 500 với thông báo kiểu `Error resolving template [pong]`, hoặc 404 tùy cấu hình view. Sửa: đổi thành `@RestController`, hoặc thêm `@ResponseBody` lên method, khi đó chuỗi được ghi thẳng vào body.

### Câu hỏi (Đọc code): Controller dưới chạy đúng khi test một mình, nhưng trên production thỉnh thoảng trả sai người. Vì sao?

```java
@RestController
public class ProfileController {
    private String currentUser;                     // shared by all requests!

    @GetMapping("/api/profile")
    public String profile(@RequestParam String user) {
        currentUser = user;
        return "Hello " + currentUser;
    }
}
```

**Đáp án:**

**Controller là singleton bean dùng chung, trong khi Tomcat chạy nhiều request song song trên nhiều thread; field `currentUser` bị các thread ghi đè lẫn nhau.** Thread A gán `currentUser = "an"`, trước khi A kịp đọc lại thì thread B gán `"binh"`, A trả "Hello binh". Đây là race condition (N1.13) kết hợp với singleton scope (N2.7). Test một mình không lộ vì chỉ có một thread. Sửa: dùng biến cục bộ trong method (mỗi thread có stack riêng), không giữ trạng thái theo request trong field của bean singleton.

## N2.7 Spring Core: IoC, DI và bean

**IoC** (Inversion of Control): object không tự tạo dependency, quyền tạo và nối object được đảo sang container. **DI** (Dependency Injection) là cách hiện thực IoC: dependency được đưa vào từ bên ngoài. Ví dụ Java thuần dưới so sánh trước và sau DI.

> [!RECALL]
> **Interface** là hợp đồng: nói class phải có những method nào, không nói cài đặt thế nào (xem N1.7). **Constructor** là nơi object nhận giá trị ban đầu khi được tạo bằng `new`, field `final` bắt buộc phải gán trong constructor (xem N1.4 và N1.3). DI dựa đúng vào hai thứ này: class phụ thuộc vào interface, và nhận implementation qua constructor.

Trước hết hãy làm rõ vài từ. **Dependency** (phụ thuộc) của một class là object khác mà class đó cần để làm việc: `ReportService` cần một repo để lấy danh sách tên. **Container** là một object lớn của Spring (tên kỹ thuật là `ApplicationContext`) giữ và quản lý mọi object của ứng dụng. **Bean** là mỗi object nằm trong container đó. Để thấy vấn đề DI giải quyết, hãy xem bản "new cứng" trước:

```java
import java.util.List;

class MySqlEmployeeRepo {
    List<String> findNames() {
        System.out.println("connecting to MySQL...");        // a real DB call in real life
        return List.of("An", "Bình");
    }
}

class ReportService {
    private final MySqlEmployeeRepo repo = new MySqlEmployeeRepo();  // hard-wired dependency
    int count() { return repo.findNames().size(); }
}

public class HardWiredDemo {
    public static void main(String[] args) {
        System.out.println(new ReportService().count());  // prints: connecting to MySQL... then 2
    }
}
```

**Giải thích:** chạy in `connecting to MySQL...` rồi `2`. Vấn đề nằm ở dòng `new MySqlEmployeeRepo()` bên trong `ReportService`: muốn viết unit test cho `count()` thì bắt buộc phải có MySQL chạy thật, vì không có cách nào thay repo bằng bản giả; đổi sang PostgreSQL phải sửa code `ReportService`; và nếu mười service cùng `new` repo thì có mười object repo, mỗi cái tự mở kết nối. Class vừa làm nghiệp vụ vừa tự lo "đi mua nguyên liệu". Bản dưới tách hai việc đó ra:

```java
import java.util.List;

interface EmployeeRepo { List<String> findNames(); }

class ReportServiceV1 {                               // before: builds its own dependency, tied to one concrete class
    private final EmployeeRepo repo = () -> List.of("An", "Bình");
}

class ReportServiceV2 {                               // after: receives the dependency via constructor
    private final EmployeeRepo repo;
    ReportServiceV2(EmployeeRepo repo) { this.repo = repo; }
    int count() { return repo.findNames().size(); }
}

public class DiDemo {
    public static void main(String[] args) {
        EmployeeRepo fake = () -> List.of("Test");             // fake repo for unit test
        System.out.println(new ReportServiceV2(fake).count()); // prints: 1
    }
}
```

**Giải thích:** `ReportServiceV1` tự quyết định implementation (ngoài đời là `new MySqlEmployeeRepo()`), nên không thay được bằng repo giả khi test và đổi DB phải sửa code. `ReportServiceV2` chỉ biết interface: test truyền repo giả (in ra 1), chạy thật truyền repo thật. Ở đây `main` làm việc "nối dây"; trong Spring, ApplicationContext làm tự động.

### Container làm gì: tự viết một container mini

Để thấy "container" không có gì thần bí, đoạn dưới tự viết một container vài dòng: một `Map` từ kiểu sang object, có method đăng ký và lấy bean. Spring làm y như vậy ở mức ý tưởng, chỉ là tự động và đầy đủ hơn nhiều.

```java
import java.util.HashMap;
import java.util.List;
import java.util.Map;

interface NameRepo { List<String> findNames(); }

class InMemoryNameRepo implements NameRepo {
    public List<String> findNames() { return List.of("An", "Bình", "Chi"); }
}

class CountService {
    private final NameRepo repo;
    CountService(NameRepo repo) { this.repo = repo; }           // dependency comes from outside
    int count() { return repo.findNames().size(); }
}

public class MiniContainer {
    private final Map<Class<?>, Object> beans = new HashMap<>(); // the "bean registry"

    <T> void register(Class<T> type, T bean) { beans.put(type, bean); }
    <T> T getBean(Class<T> type) { return type.cast(beans.get(type)); }

    public static void main(String[] args) {
        MiniContainer ctx = new MiniContainer();
        ctx.register(NameRepo.class, new InMemoryNameRepo());                          // create bean
        ctx.register(CountService.class, new CountService(ctx.getBean(NameRepo.class))); // wire bean
        CountService a = ctx.getBean(CountService.class);
        CountService b = ctx.getBean(CountService.class);
        System.out.println(a.count());   // prints: 3
        System.out.println(a == b);      // prints: true
    }
}
```

**Giải thích:** in `3` rồi `true`. Container giữ **một** object `CountService`, ai hỏi cũng nhận đúng object đó (`a == b`), đây chính là ý nghĩa của scope singleton mặc định. `CountService` không biết repo được tạo ở đâu, chỉ nhận qua constructor. Spring thay hai dòng `register` viết tay bằng cách: quét các class có `@Component`/`@Service`..., đọc constructor để biết cần bean nào, tạo theo đúng thứ tự phụ thuộc, rồi đưa vào. Đó là "đảo ngược quyền điều khiển": không phải `CountService` đi tìm repo, mà container mang repo tới cho nó.

**Bean** là object do Spring container tạo và quản lý. `@Component` đánh dấu class chung; `@Service` (nghiệp vụ), `@Repository` (truy cập dữ liệu, dịch exception của DB sang `DataAccessException`), `@Controller`/`@RestController` (web) là các biến thể mang ý nghĩa phân tầng. `@Component` gắn lên class để component scan tự phát hiện; `@Bean` gắn lên method trong `@Configuration`, bạn tự viết code tạo object, dùng cho class của thư viện hoặc khi cần logic khởi tạo riêng.

```java
@Configuration
public class AppConfig {
    @Bean                                   // Clock belongs to the JDK, so declare it with @Bean
    public Clock clock() { return Clock.systemDefaultZone(); }
}

@Service
public class AlertService {
    private final NotificationSender email;
    private final NotificationSender sms;

    // Single constructor: Spring injects automatically, no @Autowired needed
    public AlertService(NotificationSender email,                        // gets the @Primary bean
                        @Qualifier("smsSender") NotificationSender sms) { // picks a bean by name
        this.email = email;
        this.sms = sms;
    }
}
```

**Giải thích:** giả sử `NotificationSender` có hai bean: `EmailSender` gắn `@Component @Primary` và `SmsSender` gắn `@Component("smsSender")`. Tham số không chỉ định nhận bean `@Primary`, tham số có `@Qualifier` nhận đúng bean `smsSender`. Bỏ cả hai annotation thì ứng dụng không khởi động được, báo `NoUniqueBeanDefinitionException`. Constructor injection cho field `final` và test bằng `new AlertService(...)`; field injection khó test hơn (Chương 4).

### Lỗi NoUniqueBeanDefinitionException nguyên văn và cách sửa

Đây là lỗi người mới gặp rất sớm: có hai class cùng implement một interface, và một chỗ inject interface đó mà không nói rõ muốn cái nào. Bản sai:

```java
public interface NotificationSender { void send(String to, String msg); }

@Component
public class EmailSender implements NotificationSender {
    public void send(String to, String msg) { /* send email */ }
}

@Component
public class SmsSender implements NotificationSender {
    public void send(String to, String msg) { /* send SMS */ }
}

@Service
public class WelcomeService {
    private final NotificationSender sender;
    public WelcomeService(NotificationSender sender) { this.sender = sender; }  // which one?
}
```

**Giải thích:** ứng dụng không khởi động được. Spring Boot in ra (đường dẫn class rút gọn):

```text
***************************
APPLICATION FAILED TO START
***************************

Description:

Parameter 0 of constructor in com.corp.hr.WelcomeService required a single bean, but 2 were found:
	- emailSender: defined in file [.../EmailSender.class]
	- smsSender: defined in file [.../SmsSender.class]

Action:

Consider marking one of the beans as @Primary, updating the consumer to accept multiple beans, or using @Qualifier to identify the bean that should be consumed
```

**Giải thích:** exception gốc bên dưới là `NoUniqueBeanDefinitionException: No qualifying bean of type 'com.corp.hr.NotificationSender' available: expected single matching bean but found 2: emailSender,smsSender`. Tên bean mặc định là tên class viết thường chữ đầu (`emailSender`). Chính thông báo đã gợi ý ba cách sửa:

```java
// Fix 1: mark a default implementation
@Component @Primary
public class EmailSender implements NotificationSender { /* ... */ }

// Fix 2: name the exact bean at the injection point
public WelcomeService(@Qualifier("smsSender") NotificationSender sender) { this.sender = sender; }

// Fix 3: accept all implementations
public WelcomeService(List<NotificationSender> senders) { this.senders = senders; }
```

**Giải thích:** `@Primary` hợp khi có một lựa chọn "mặc định" dùng ở đa số chỗ. `@Qualifier` hợp khi chỗ inject cần đích danh một bean; nó thắng `@Primary`. Nhận `List<NotificationSender>` (hoặc `Map<String, NotificationSender>` với key là tên bean) hợp khi muốn gửi qua mọi kênh hoặc chọn kênh lúc chạy, đây cũng là nền tảng của Strategy pattern ở N2.12.

**Bean scope** quyết định số instance. Spring 6 có đúng 6 scope: `singleton` (mặc định, 1 instance mỗi container), `prototype` (mỗi lần lấy tạo mới), và 4 scope web: `request`, `session`, `application` (mỗi ServletContext), `websocket`.

> [!TRAP]
> Nhiều tài liệu liệt kê scope `global session`. Scope này chỉ dành cho Portlet và đã bị gỡ từ Spring 5.

Cấu hình nằm ngoài code, trong `application.yml`, và thay đổi theo môi trường bằng **profile**.

```yaml
app:
  company-name: Corp VN
spring:
  profiles:
    active: dev
---
spring:
  config:
    activate:
      on-profile: prod          # this block applies only when profile prod is active
  datasource:
    url: jdbc:mysql://db.prod:3306/hr
```

**Giải thích:** dấu `---` chia file thành hai tài liệu; khối đầu luôn được nạp, khối sau chỉ có hiệu lực và ghi đè khối đầu khi profile `prod` bật (hoặc tách ra file `application-prod.yml`). Trên server bật profile bằng biến môi trường `SPRING_PROFILES_ACTIVE=prod`. Trong code đọc giá trị bằng `@Value("${app.company-name}")`, có mặc định kiểu `@Value("${app.page-size:20}")`; nhiều thuộc tính thì dùng `@ConfigurationProperties` (Chương 4).

### Câu hỏi (Cơ bản): IoC và DI khác nhau thế nào? Có mấy kiểu DI?

IoC là nguyên lý đảo quyền tạo object sang container; DI là cách hiện thực nó. Có ba kiểu DI: constructor (khuyến nghị cho dependency bắt buộc), setter (dependency tùy chọn), field (ngắn nhưng khó test, nên tránh).

### Câu hỏi (Cơ bản): Bean là gì? Mọi object trong ứng dụng Spring có phải bean không?

**Bean là object do Spring container tạo, nối dependency và quản lý vòng đời; không phải mọi object đều là bean.** Service, repository, controller, cấu hình là bean vì chúng sống suốt ứng dụng và được dùng chung. Entity `Employee`, DTO `EmployeeRequest`, danh sách kết quả là object bình thường tạo bằng `new` hoặc do Hibernate/Jackson tạo, vì mỗi request có dữ liệu riêng. Một object bạn tự `new` không được Spring quản lý: không được inject gì, `@Transactional` trên nó cũng không có tác dụng.

### Câu hỏi (Hiểu sâu): `@Component` khác `@Bean` thế nào, khi nào dùng cái nào?

**`@Component` gắn lên class của bạn để Spring tự phát hiện qua component scan; `@Bean` gắn lên method trong `@Configuration`, bạn tự viết code tạo object.** Dùng `@Component` (hoặc `@Service`, `@Repository`) cho class trong code của mình. Dùng `@Bean` khi không sửa được source để gắn annotation (class thư viện như `Clock`, `RestTemplate`, `ObjectMapper`), khi cần logic khởi tạo tùy biến, hoặc khi cần nhiều bean cùng kiểu cấu hình khác nhau (hai `DataSource`).

### Câu hỏi (Hiểu sâu): Vì sao constructor injection cho phép field `final` còn field injection thì không?

**Vì `final` bắt buộc phải được gán đúng một lần trước khi constructor kết thúc (N1.3, N1.4), và chỉ constructor injection đưa giá trị vào đúng lúc đó.** Với field injection, Spring gọi constructor rỗng trước, rồi mới dùng reflection gán field sau, nên field không thể `final`. Hệ quả thực tế của constructor injection: object luôn đầy đủ dependency ngay khi tạo, không có trạng thái "nửa vời" với field null; test chỉ cần `new AlertService(mockEmail, mockSms)`; và constructor quá nhiều tham số là tín hiệu class đang ôm quá nhiều việc.

### Câu hỏi (Đọc code): Đoạn cấu hình dưới in ra gì?

```java
@Component
@Scope("prototype")
class Ticket {
    private static int created = 0;
    final int no = ++created;
}

@Component
class Counter { int value; }

// somewhere after startup, with ApplicationContext ctx:
// Ticket t1 = ctx.getBean(Ticket.class);
// Ticket t2 = ctx.getBean(Ticket.class);
// Counter c1 = ctx.getBean(Counter.class);
// Counter c2 = ctx.getBean(Counter.class);
// c1.value++;
// System.out.println(t1.no + " " + t2.no + " " + (t1 == t2));
// System.out.println(c2.value + " " + (c1 == c2));
```

**Đáp án:**

In `1 2 false` rồi `1 true`. `Ticket` là prototype nên mỗi `getBean` tạo object mới: `t1.no = 1`, `t2.no = 2`, khác nhau. `Counter` là singleton mặc định nên `c1` và `c2` là cùng một object; tăng `c1.value` thì đọc qua `c2` cũng thấy 1. Lưu ý: prototype bean được inject vào một singleton chỉ được tạo **một lần** lúc inject, không phải mỗi lần dùng; muốn mới mỗi lần phải lấy qua `ObjectProvider<Ticket>`.

## N2.8 Spring MVC và ví dụ CRUD

`@PathVariable` lấy giá trị trong đường dẫn (`/api/employees/5`), thường là id. `@RequestParam` lấy từ query string (`?page=0&size=20`), hợp cho lọc, phân trang, có thể kèm giá trị mặc định. `@RequestBody` đọc body JSON thành object qua Jackson, mỗi method chỉ có một. Ví dụ CRUD dưới dùng Spring Boot 3 với các starter `web`, `data-jpa`, `validation`. Tầng đầu tiên là entity.

**CRUD** là bốn thao tác cơ bản trên dữ liệu: Create (tạo), Read (đọc), Update (sửa), Delete (xóa), tương ứng với `POST`, `GET`, `PUT`/`PATCH`, `DELETE` trong REST và `INSERT`, `SELECT`, `UPDATE`, `DELETE` trong SQL. Ứng dụng Spring thường chia làm các tầng, mỗi tầng một việc: **Controller** nói chuyện HTTP, **Service** chứa nghiệp vụ và transaction, **Repository** nói chuyện với DB, **Entity** là class đại diện cho một dòng trong bảng. **DTO** (Data Transfer Object) là class chỉ để chở dữ liệu vào/ra API, tách khỏi entity để không lộ cấu trúc DB. Bảng dưới đối chiếu ba cách lấy tham số với một request cụ thể:

| Request | Annotation | Giá trị nhận được |
|---|---|---|
| `GET /api/employees/5` | `@PathVariable Long id` | `id = 5` |
| `GET /api/employees?page=2&size=20` | `@RequestParam int page` | `page = 2` |
| `GET /api/employees` (thiếu page) | `@RequestParam(defaultValue = "0") int page` | `page = 0` |
| `POST /api/employees` body JSON | `@RequestBody EmployeeRequest req` | object `req` đầy đủ field |

```java
@Entity
@Table(name = "employees")
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)      // DB generates the id
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    private BigDecimal salary;                               // same name as the column, no @Column needed

    protected Employee() {}                                  // JPA requires a no-arg constructor

    public Employee(String fullName, String email, BigDecimal salary) {
        this.fullName = fullName; this.email = email; this.salary = salary;
    }
    // getters and setters omitted
}
```

**Giải thích:** `@Entity` báo Hibernate đây là class được map, `@Table` chỉ tên bảng, `@Id` đánh dấu khóa chính, `@GeneratedValue(IDENTITY)` giao việc sinh id cho DB. Từ Spring Boot 3, các annotation này thuộc `jakarta.persistence`, không còn `javax.persistence`.

Tầng Repository chỉ là interface; Spring Data JPA sinh class cài đặt lúc chạy.

```java
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);   // derived query: WHERE email = ?
    boolean existsByEmail(String email);
}
```

**Giải thích:** kế thừa `JpaRepository` là có sẵn `save`, `findById`, `findAll` (có phân trang), `deleteById`. Hai method còn lại là derived query: Spring phân tích tên method để sinh truy vấn; gõ sai tên field (`findByMail`) thì ứng dụng báo lỗi lúc khởi động.

Tầng Service chứa nghiệp vụ và ranh giới transaction; DTO đầu vào là record có ràng buộc validation.

> [!RECALL]
> `EmployeeNotFoundException` dưới đây kế thừa `RuntimeException`, tức là unchecked exception: compiler không bắt buộc `try/catch` hay `throws` (xem N1.12). Spring cũng mặc định chỉ rollback `@Transactional` khi gặp unchecked exception. Transaction là gì và vì sao cần rollback: xem kịch bản chuyển tiền ở N2.4.

```java
public record EmployeeRequest(@NotBlank String fullName,
                              @NotBlank @Email String email,
                              @NotNull @Positive BigDecimal salary) {}

@Service
public class EmployeeService {
    private final EmployeeRepository repo;
    public EmployeeService(EmployeeRepository repo) { this.repo = repo; }

    public Employee get(Long id) {
        return repo.findById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
    }

    @Transactional
    public Employee create(EmployeeRequest req) {
        if (repo.existsByEmail(req.email())) throw new IllegalStateException("Email đã tồn tại");
        return repo.save(new Employee(req.fullName(), req.email(), req.salary()));
    }
}
```

**Giải thích:** `EmployeeNotFoundException` là một `RuntimeException` tự định nghĩa để tầng web chuyển thành 404. `@Transactional` đặt ở method ghi để lỗi giữa chừng thì rollback. `existsByEmail` chỉ để báo lỗi thân thiện; chống trùng thật sự vẫn là ràng buộc UNIQUE trong DB.

Tầng Controller nhận request và dùng `ResponseEntity` khi cần kiểm soát status code, header.

```java
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final EmployeeService service;
    public EmployeeController(EmployeeService service) { this.service = service; }

    @GetMapping("/{id}")
    public Employee get(@PathVariable Long id) { return service.get(id); }   // 200

    @PostMapping
    public ResponseEntity<Employee> create(@Valid @RequestBody EmployeeRequest req) {
        Employee saved = service.create(req);
        return ResponseEntity.created(URI.create("/api/employees/" + saved.getId()))
                             .body(saved);                                   // 201 + Location
    }
}
```

**Giải thích:** `@RequestMapping` ở class đặt tiền tố chung, `@GetMapping`/`@PostMapping` khớp theo HTTP method. `@Valid` kích hoạt kiểm tra ràng buộc trong `EmployeeRequest`; thiếu `@Valid` hoặc thiếu `spring-boot-starter-validation` thì `@NotBlank` bị bỏ qua, câu bẫy hay gặp. Trả thẳng object cho status 200; muốn 201 kèm `Location` thì dùng `ResponseEntity`. Để ngắn gọn tôi trả entity; dự án thật nên trả DTO.

### Phải có @Valid: bản sai và bản sửa

Quy tắc "muốn validate body thì phải đặt `@Valid`" dễ quên vì thiếu nó **không có lỗi gì báo ra**. Bản sai:

```java
@PostMapping
public ResponseEntity<Employee> create(@RequestBody EmployeeRequest req) {   // no @Valid
    return ResponseEntity.ok(service.create(req));
}
```

**Giải thích:** gửi `{"fullName": "", "email": "abc", "salary": -5}` thì request lọt qua, `@NotBlank`, `@Email`, `@Positive` trên record chỉ là "nhãn dán" không ai đọc. Nếu may mắn, DB chặn lại bằng `CHECK (salary > 0)` và client nhận 500 khó hiểu; nếu không, dữ liệu rác nằm trong DB. Bản sửa là thêm `@Valid` như controller ở trên. Khi đó Spring kiểm tra trước khi gọi method, ném `MethodArgumentNotValidException` và client nhận 400 Bad Request; method `create` không bao giờ chạy với dữ liệu sai.

Cuối cùng, `@RestControllerAdvice` gom xử lý lỗi của mọi controller về một chỗ.

```java
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmployeeNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)                            // returns 404
    public Map<String, String> notFound(EmployeeNotFoundException ex) {
        return Map.of("error", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)                             // duplicate email: 409
    public Map<String, String> conflict(IllegalStateException ex) {
        return Map.of("error", ex.getMessage());
    }
}
```

**Giải thích:** gọi `GET /api/employees/99` nhận 404 kèm `{"error": "..."}` thay vì 500 kèm stack trace; tạo trùng email nhận 409. Không có class này, mỗi controller phải tự `try/catch`, lặp code và format lỗi không thống nhất. Dữ liệu vi phạm `@Valid` ném `MethodArgumentNotValidException`, Spring Boot mặc định trả 400; muốn body liệt kê lỗi từng field thì thêm một handler cho exception này. Chuẩn `ProblemDetail` ở Chương 4 và 7.

Ghép cả bốn tầng lại, đây là những gì client thấy khi gọi API (dùng `curl`, output rút gọn):

```bash
curl -i -X POST localhost:8080/api/employees \
     -H 'Content-Type: application/json' \
     -d '{"fullName":"Em","email":"em@corp.vn","salary":1300}'
# HTTP/1.1 201
# Location: /api/employees/5
# {"id":5,"fullName":"Em","email":"em@corp.vn","salary":1300}

curl -i -X POST localhost:8080/api/employees \
     -H 'Content-Type: application/json' \
     -d '{"fullName":"Em","email":"em@corp.vn","salary":1300}'
# HTTP/1.1 409
# {"error":"Email đã tồn tại"}

curl -i localhost:8080/api/employees/99
# HTTP/1.1 404
```

**Giải thích:** lần đầu tạo thành công, nhận 201 và địa chỉ bản ghi mới. Lần hai gửi lại đúng body đó, service thấy email đã có nên ném `IllegalStateException`, advice đổi thành 409. Đọc id không tồn tại nhận 404. Mỗi status code đến từ đúng một chỗ trong code, đó là lợi ích của việc gom xử lý lỗi.

### Câu hỏi (Cơ bản): `@PathVariable` khác `@RequestParam` thế nào, khi nào dùng cái nào?

**`@PathVariable` lấy giá trị nằm trong đường dẫn và thường dùng để định danh một tài nguyên; `@RequestParam` lấy giá trị từ query string và dùng cho lọc, sắp xếp, phân trang.** `GET /api/employees/5` đọc nhân viên số 5, id là một phần địa chỉ của tài nguyên. `GET /api/employees?department=IT&page=0` là danh sách với điều kiện tùy chọn, có thể bỏ trống và có giá trị mặc định. `@RequestParam` mặc định là bắt buộc: thiếu tham số thì trả 400, trừ khi đặt `required = false` hoặc `defaultValue`.

### Câu hỏi (Đọc code): Với code CRUD ở trên, gọi `POST /api/employees` với body `{"fullName": "  ", "email": "x@corp.vn", "salary": 100}` thì nhận về gì?

```json
{"fullName": "  ", "email": "x@corp.vn", "salary": 100}
```

**Đáp án:**

**400 Bad Request, method `create` trong service không chạy.** `@NotBlank` từ chối chuỗi chỉ có khoảng trắng (khác `@NotEmpty` chỉ từ chối chuỗi rỗng). Vì controller có `@Valid`, Spring kiểm tra trước khi gọi method, ném `MethodArgumentNotValidException`, Spring Boot trả 400. Nếu xóa `@Valid`, request sẽ đi thẳng vào service và nhân viên tên "  " được lưu với 201.

### Câu hỏi (Thực chiến): Vì sao dự án thật không nên trả thẳng entity ra API?

**Vì entity gắn với cấu trúc DB, còn API là hợp đồng với client; trộn hai thứ làm lộ dữ liệu, gây lỗi Jackson và khiến mỗi lần sửa DB thành sửa API.** Cụ thể: entity có thể chứa field nhạy cảm (mật khẩu đã băm, lương) bị trả ra theo; Jackson serialize quan hệ LAZY có thể gây `LazyInitializationException` hoặc truy vấn thừa (N2.11); quan hệ hai chiều `Department` ↔ `Employee` làm Jackson đệ quy vô hạn; đổi tên cột là client vỡ. Dùng DTO (thường là record) để quyết định chính xác field nào đi ra.

### Câu hỏi (Đọc code): Đoạn service dưới thiếu gì mà dữ liệu bị "nửa vời" khi lỗi?

```java
@Service
public class PayrollService {
    private final EmployeeRepository repo;
    public PayrollService(EmployeeRepository repo) { this.repo = repo; }

    public void raiseAll(List<Long> ids) {                 // no @Transactional
        for (Long id : ids) {
            Employee e = repo.findById(id).orElseThrow();  // throws for a missing id
            e.setSalary(e.getSalary().add(BigDecimal.valueOf(100)));
            repo.save(e);
        }
    }
}
```

**Đáp án:**

**Thiếu `@Transactional`, nên mỗi `save` là một transaction riêng; gặp id không tồn tại ở giữa danh sách thì những người trước đã được tăng lương, những người sau thì không.** Đây đúng là bản Java của kịch bản chuyển tiền sai ở N2.4. Thêm `@Transactional` lên method: toàn bộ vòng lặp thành một transaction, exception làm rollback tất cả. Khi đã có `@Transactional`, entity load ra là managed nên thậm chí không cần gọi `save`, dirty checking tự sinh UPDATE (N2.11).

## N2.9 Spring Boot và Maven

Spring Boot không thay thế Spring mà là lớp tiện ích bên trên: **starter** gom sẵn dependency với phiên bản tương thích, **auto-configuration** tự tạo bean theo thư viện có trong classpath (thấy `data-jpa` thì tự tạo `DataSource`, `EntityManagerFactory`), **Tomcat nhúng** để chạy bằng `java -jar` thay vì deploy WAR. Spring Boot 3 yêu cầu Java 17 trở lên. Dependency khai báo trong `pom.xml`:

Giải nghĩa vài từ: **dependency** ở đây là thư viện bên ngoài mà dự án cần (Spring, Jackson, driver MySQL), đóng gói dưới dạng file `.jar`. **Classpath** là danh sách các file `.jar` và thư mục class mà JVM được phép nạp khi chạy. **Maven** là công cụ tự tải dependency từ kho trung tâm (Maven Central) về máy, đưa vào classpath, rồi biên dịch, chạy test, đóng gói. Không có Maven, bạn phải tự tải từng file `.jar` và tự tìm phiên bản tương thích nhau, gồm cả hàng chục thư viện mà các thư viện đó lại cần.

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>                       <!-- pins the version for every starter -->
</parent>
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>                      <!-- needed only at runtime -->
    </dependency>
</dependencies>
```

**Giải thích:** mỗi dependency định danh bằng `groupId:artifactId:version`; parent đã chốt phiên bản nên starter không cần ghi version. `scope`: `compile` (mặc định), `provided` (môi trường chạy tự cung cấp), `runtime` (chỉ khi chạy), `test` (chỉ khi test). `mvn clean package` xóa `target`, biên dịch, chạy test, đóng gói `target/*.jar`; `mvn clean install` chép thêm vào kho local `~/.m2`. Gradle tương đương: `./gradlew build`.

Một starter kéo theo rất nhiều thư viện. Lệnh `mvn dependency:tree` cho bạn thấy cây phụ thuộc thật; output dưới rút gọn, số phiên bản tùy bản Spring Boot:

```bash
mvn dependency:tree
# [INFO] com.corp:employee-service:jar:1.0.0
# [INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.3.4:compile
# [INFO] |  +- org.springframework.boot:spring-boot-starter-json:jar:3.3.4:compile
# [INFO] |  |  \- com.fasterxml.jackson.core:jackson-databind:jar:2.17.2:compile
# [INFO] |  +- org.springframework.boot:spring-boot-starter-tomcat:jar:3.3.4:compile
# [INFO] |  \- org.springframework:spring-webmvc:jar:6.1.13:compile
# [INFO] \- com.mysql:mysql-connector-j:jar:8.3.0:runtime
```

**Giải thích:** bạn chỉ khai báo hai dependency, nhưng `starter-web` kéo theo Jackson (chuyển JSON), Tomcat nhúng và Spring MVC; đó là các **transitive dependency** (phụ thuộc bắc cầu). Nhờ có Tomcat trong classpath mà auto-configuration biết cần khởi động web server; nhờ có Jackson mà controller trả JSON được. Lệnh này cũng là công cụ đầu tiên khi gặp xung đột phiên bản, ví dụ hai thư viện kéo về hai bản Jackson khác nhau và ứng dụng ném `NoSuchMethodError` lúc chạy.

### Câu hỏi (Cơ bản): Spring khác Spring Boot thế nào?

**Spring là framework lõi (IoC container, MVC, transaction, data access); Spring Boot là lớp tiện ích bên trên giúp dựng ứng dụng Spring nhanh bằng starter, auto-configuration và server nhúng.** Không có Boot, bạn tự chọn phiên bản từng thư viện, tự khai báo `DataSource`, `DispatcherServlet`, tự cài Tomcat rồi deploy file WAR. Với Boot, thêm `spring-boot-starter-data-jpa` và vài dòng `spring.datasource.*` là có sẵn kết nối DB, chạy bằng `java -jar`. Boot không che mất Spring: mọi bean tự tạo đều có thể ghi đè bằng bean của bạn.

### Câu hỏi (Hiểu sâu): Auto-configuration biết tạo bean nào bằng cách nào?

**Nó nhìn vào classpath và cấu hình hiện có: mỗi class auto-configuration có các điều kiện `@ConditionalOn...`, chỉ tạo bean khi điều kiện đúng.** Ví dụ cấu hình DataSource chỉ chạy khi có class `DataSource` và driver JDBC trong classpath (`@ConditionalOnClass`), và chỉ tạo bean nếu bạn chưa tự khai báo `DataSource` (`@ConditionalOnMissingBean`). Vì vậy thêm dependency `data-jpa` mà chưa cấu hình URL DB thì ứng dụng báo `Failed to configure a DataSource: 'url' attribute is not specified`. Chạy với `--debug` sẽ in báo cáo cấu hình nào được bật, cấu hình nào bị bỏ và vì sao.

### Câu hỏi (Cơ bản): Scope `provided` và `runtime` khác nhau thế nào? Cho ví dụ.

**`provided` là cần khi biên dịch nhưng môi trường chạy tự có sẵn nên không đóng gói; `runtime` là không cần khi biên dịch nhưng phải có khi chạy.** Ví dụ `provided`: `jakarta.servlet-api` khi deploy WAR lên Tomcat ngoài, vì Tomcat đã có thư viện servlet; Lombok cũng hay khai báo `provided` vì chỉ dùng lúc biên dịch. Ví dụ `runtime`: driver `mysql-connector-j`, vì code chỉ dùng interface JDBC chuẩn, driver cụ thể chỉ cần khi thật sự kết nối DB.

## N2.10 AOP cơ bản

AOP tách logic cắt ngang nhiều nơi (logging, đo thời gian, transaction, phân quyền) ra khỏi code nghiệp vụ. **Aspect** là class chứa logic đó. **Join point** là điểm có thể chèn logic; với Spring AOP luôn là lời gọi method. **Pointcut** là biểu thức chọn ra những join point được áp dụng. **Advice** là đoạn code chạy tại join point: `@Before`, `@AfterReturning`, `@AfterThrowing`, `@After`, `@Around`. Ví dụ đo thời gian mọi method trong tầng service (cần `spring-boot-starter-aop`):

Vì sao cần AOP? Giả sử bạn muốn đo thời gian chạy của 50 method service. Cách thủ công là chép cùng một đoạn `long start = ...; try { ... } finally { log... }` vào cả 50 method: code nghiệp vụ bị lẫn với code đo đạc, và quên một chỗ là mất số liệu. "Cắt ngang" (cross-cutting) nghĩa là logic này cắt qua mọi tầng, mọi class, không thuộc về riêng nghiệp vụ nào. AOP cho phép viết nó **một lần** rồi khai báo "áp dụng cho các method nào".

```java
@Aspect
@Component
public class TimingAspect {
    private static final Logger log = LoggerFactory.getLogger(TimingAspect.class);

    @Around("execution(public * com.corp.hr.service..*(..))")   // pointcut: public methods in the service package
    public Object measure(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return pjp.proceed();                                  // call the real method
        } finally {
            log.info("{} chạy {} ms", pjp.getSignature().toShortString(),
                     System.currentTimeMillis() - start);
        }
    }
}
```

**Giải thích:** controller gọi `EmployeeService.create(...)` thực chất là gọi proxy; proxy chạy advice, advice gọi `pjp.proceed()` để chạy method thật rồi log `EmployeeService.create(..) chạy 12 ms`. `EmployeeService` không hề biết có logging. Vì dựa trên proxy, lời gọi nội bộ `this.otherMethod()` không đi qua aspect, cũng là lý do `@Transactional` mất tác dụng khi tự gọi (Chương 4). Spring dùng chính AOP cho `@Transactional`, `@Cacheable`, `@Async`.

### Proxy là gì: tự làm bằng Java thuần

Từ "proxy" xuất hiện ở trên rất nhiều lần. **Proxy** là một object "đứng thay" cho object thật: có cùng các method, bên gọi tưởng đang gọi object thật, nhưng proxy được chen code trước và sau rồi mới chuyển lời gọi tới object thật. JDK có sẵn `java.lang.reflect.Proxy` để tạo proxy cho một interface; đoạn dưới chạy được không cần Spring:

```java
import java.lang.reflect.Proxy;

interface GreetingService { String hello(String name); }

class GreetingServiceImpl implements GreetingService {
    public String hello(String name) { return "Hello " + name; }
}

public class ProxyDemo {
    public static void main(String[] args) {
        GreetingService target = new GreetingServiceImpl();
        GreetingService proxy = (GreetingService) Proxy.newProxyInstance(
            GreetingService.class.getClassLoader(),
            new Class<?>[]{GreetingService.class},
            (p, method, params) -> {
                System.out.println("before " + method.getName());   // advice before
                Object result = method.invoke(target, params);       // like pjp.proceed()
                System.out.println("after " + method.getName());    // advice after
                return result;
            });
        System.out.println(proxy.hello("An"));
        // prints: before hello | after hello | Hello An
    }
}
```

**Giải thích:** chương trình in ba dòng `before hello`, `after hello`, `Hello An`. Bên gọi dùng `proxy` như một `GreetingService` bình thường; lambda ở giữa đóng vai advice `@Around`, `method.invoke(target, ...)` đóng vai `pjp.proceed()`. Spring AOP tạo đúng loại object này (với class không có interface thì dùng thư viện CGLIB để tạo class con). Điều quan trọng: chỉ lời gọi **đi qua biến `proxy`** mới có advice; nếu bên trong `GreetingServiceImpl` một method gọi `this.hello(...)` thì `this` là object thật, không có "before/after". Đó là gốc của lỗi self-invocation.

### Câu hỏi (Cơ bản): Giải thích aspect, join point, pointcut, advice qua một ví dụ.

**Lấy ví dụ ghi log thời gian chạy của tầng service: aspect là class `TimingAspect`, advice là method `measure` chạy quanh lời gọi, pointcut là biểu thức `execution(public * com.corp.hr.service..*(..))` chọn method nào bị áp dụng, và mỗi lần gọi `EmployeeService.create(...)` là một join point.** Một câu dễ nhớ: aspect là "cái gì" (module), advice là "làm gì, lúc nào" (trước, sau, bao quanh), pointcut là "ở đâu".

### Câu hỏi (Đọc code): `report()` được controller gọi. Log thời gian của `TimingAspect` in ra cho những method nào?

```java
@Service
public class ReportService {
    public String report() {
        return "R:" + this.buildBody();    // self-invocation
    }
    public String buildBody() {
        return "body";
    }
}
```

**Đáp án:**

**Chỉ `report()` được log, `buildBody()` thì không, dù cả hai đều public trong package service.** Controller giữ tham chiếu tới proxy nên lời gọi `report()` đi qua advice. Bên trong, `this.buildBody()` gọi thẳng trên object thật, không qua proxy, nên aspect không chạy. Cùng cơ chế làm `@Transactional` hoặc `@Cacheable` trên `buildBody()` mất tác dụng khi được gọi từ `report()`. Cách sửa phổ biến: tách `buildBody()` sang một bean khác và inject vào.

### Câu hỏi (Hiểu sâu): `@Around` khác `@Before` thế nào? Khi nào bắt buộc dùng `@Around`?

**`@Before` chỉ chạy trước method và không điều khiển được lời gọi; `@Around` bao quanh, tự quyết định có gọi `proceed()` hay không, đọc và sửa được giá trị trả về.** Cần `@Around` khi phải làm việc ở cả hai phía (đo thời gian, mở và đóng transaction), khi muốn chặn không cho method chạy (kiểm tra quyền, trả kết quả từ cache), hoặc khi muốn thử lại. Chỉ ghi log tham số thì `@Before` đủ và an toàn hơn, vì với `@Around` quên gọi `proceed()` là method thật không bao giờ chạy và trả về `null`.

## N2.11 JPA và Hibernate cơ bản

**ORM** map class với bảng, object với dòng, để thao tác bằng object thay vì viết SQL và đọc `ResultSet` bằng tay. Lợi ích: ít code lặp, tương đối độc lập DB, có dirty checking, cache. Nhược điểm: SQL bị che nên dễ dính N+1, báo cáo phức tạp vẫn nên viết SQL. **JPA** là đặc tả (interface, annotation); **Hibernate** là implementation phổ biến nhất; **Spring Data JPA** nằm trên cùng, sinh repository từ interface.

### ORM qua ví dụ mapping bảng và class

ORM (Object-Relational Mapping, ánh xạ đối tượng – quan hệ) giải quyết một chuyện: Java nghĩ bằng **object**, DB nghĩ bằng **bảng**. Bảng `employees` ở N2.1 và class `Employee` ở N2.8 đối chiếu như sau:

| Phía DB | Phía Java | Annotation nối hai bên |
|---|---|---|
| Bảng `employees` | Class `Employee` | `@Entity`, `@Table(name = "employees")` |
| Một dòng (An, 2000, phòng 1) | Một object `Employee` | Hibernate tạo object từ dòng |
| Cột `full_name` | Field `fullName` | `@Column(name = "full_name")` |
| Khóa chính `id` | Field `id` | `@Id`, `@GeneratedValue` |
| Khóa ngoại `department_id` | Field `Department department` | `@ManyToOne`, `@JoinColumn` |

Không có ORM, mỗi truy vấn bạn phải tự viết SQL và tự chép từng cột sang field, như đoạn JDBC dưới:

```java
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

record EmployeeRow(long id, String fullName, BigDecimal salary) {}

class JdbcEmployeeDao {
    EmployeeRow findById(Connection conn, long id) throws SQLException {
        String sql = "SELECT id, full_name, salary FROM employees WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;                     // no such row
                return new EmployeeRow(rs.getLong("id"),         // copy column -> field by hand
                                       rs.getString("full_name"),
                                       rs.getBigDecimal("salary"));
            }
        }
    }
}
```

**Giải thích:** mười mấy dòng cho một truy vấn đơn giản, và phải lặp lại cho mọi bảng, mọi truy vấn; thêm một cột là phải sửa SQL và code chép dữ liệu ở mọi nơi. Với JPA, việc đó thu gọn thành `repo.findById(id)`: Hibernate đọc annotation, tự sinh `SELECT`, tự tạo object `Employee` và gán field. Cái giá là bạn không còn nhìn thấy SQL, nên phải bật log SQL (`spring.jpa.show-sql=true` hoặc logger `org.hibernate.SQL`) để biết Hibernate thực sự chạy gì.

> [!RECALL]
> Hibernate tạo object entity từ dòng DB bằng reflection: gọi **constructor không tham số** rồi gán từng field. Compiler chỉ tự sinh constructor rỗng khi class không khai báo constructor nào (xem N1.4); entity có constructor `Employee(String, String, BigDecimal)` thì phải tự viết thêm constructor rỗng.

Đây là quy tắc "phải có constructor rỗng" dạng sai và sửa:

```java
@Entity
public class Employee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String fullName;

    public Employee(String fullName) { this.fullName = fullName; }  // only constructor: no no-arg one
}

// Fix: add a no-arg constructor; protected keeps other code from calling it by mistake
// protected Employee() {}
```

**Giải thích:** lưu (`persist`) vẫn chạy vì object do bạn tự `new`, nhưng lần đầu **đọc** từ DB (`findById`, `findAll`) Hibernate cần tự tạo object và ném lỗi dạng `org.hibernate.InstantiationException: No default constructor for entity`. Tùy phiên bản, lỗi có thể lộ ngay lúc khởi động. Sửa bằng một constructor không tham số `public` hoặc `protected` (JPA cho phép cả hai, không được `private`); chọn `protected` để code nghiệp vụ không vô tình tạo entity rỗng. Lombok thì dùng `@NoArgsConstructor(access = AccessLevel.PROTECTED)`.

Bên nào giữ cột khóa ngoại là **owning side** của quan hệ.

```java
@Entity
public class Department {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "department")      // inverse side: points to field "department" of Employee
    private List<Employee> employees = new ArrayList<>();
}

@Entity
public class Employee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)       // default is EAGER, switch to LAZY
    @JoinColumn(name = "department_id")      // owning side: the FK column lives in table employees
    private Department department;
}
```

**Giải thích:** Hibernate dựa vào `Employee.department` để ghi cột `department_id`; `Department.employees` có `mappedBy` chỉ để đọc ngược, nên chỉ thêm nhân viên vào list mà không `setDepartment(...)` thì cột FK không đổi. `@ManyToMany` dùng bảng trung gian qua `@JoinTable`; bảng trung gian có thêm cột thì map thành entity riêng. Fetch mặc định: `@ManyToOne`, `@OneToOne` là **EAGER**; `@OneToMany`, `@ManyToMany` là **LAZY**. LAZY chỉ tải khi truy cập (qua proxy), EAGER tải ngay; nên để mọi quan hệ LAZY và chủ động tải khi cần.

### Lazy và eager nhìn qua câu SQL Hibernate sinh ra

"Tải ngay" và "tải khi truy cập" trở nên cụ thể khi bạn bật log SQL và gọi `employeeRepository.findById(1L)` rồi `e.getDepartment().getName()`. Câu SQL dưới là dạng Hibernate 6 sinh ra, đã rút gọn danh sách cột:

```sql
-- EAGER (@ManyToOne default): one query with a join, department loaded immediately
select e1_0.id, e1_0.full_name, d1_0.id, d1_0.name
from employees e1_0
left join departments d1_0 on d1_0.id = e1_0.department_id
where e1_0.id = ?;

-- LAZY: first query reads only employees, department is a proxy holding id = 1
select e1_0.id, e1_0.full_name, e1_0.department_id
from employees e1_0
where e1_0.id = ?;
-- ...then, only when getName() is called:
select d1_0.id, d1_0.name from departments d1_0 where d1_0.id = ?;
```

**Giải thích:** với EAGER, một câu có JOIN lấy luôn phòng ban, dù bạn có dùng tới phòng ban hay không. Với LAZY, câu đầu chỉ đọc bảng `employees`; field `department` là một **proxy**, object giả chỉ biết `id = 1`. Câu thứ hai chỉ chạy khi bạn thật sự gọi method cần dữ liệu (`getName()`), và phải chạy khi persistence context còn mở. EAGER nghe tiện nhưng nguy hiểm: `findAll()` trả 100 nhân viên có thể kéo theo thêm các câu SELECT phòng ban, và bạn không tắt được ở chỗ không cần. LAZY cho bạn quyền chọn: cần thì `JOIN FETCH`, không cần thì không tốn gì.

Ngoài derived query, `@Query` cho viết **JPQL** trên entity và field Java, Hibernate dịch sang SQL của DB đang dùng: `@Query("SELECT e FROM Employee e JOIN FETCH e.department WHERE e.salary > :min")`. Chú ý đây là `Employee`, `e.salary` (class, field), không phải `employees`, `salary` (bảng, cột). **Native query** (`@Query(value = "SELECT * FROM employees ...", nativeQuery = true)`) viết trên bảng thật, dùng được hàm riêng của DB nhưng gắn chặt với DB đó.

Entity có bốn trạng thái:

- **Transient**: vừa `new`, Hibernate chưa biết tới.
- **Managed** (persistent): nằm trong persistence context sau `persist` hoặc khi được load trong transaction; gọi `setSalary(...)` mà không cần `save`, lúc commit Hibernate so với bản chụp ban đầu và tự sinh UPDATE (**dirty checking**).
- **Detached**: từng managed nhưng context đã đóng; sửa không tự lưu, muốn lưu phải `merge`.
- **Removed**: đã gọi `remove`, câu DELETE chạy lúc flush/commit.

**Persistence context** xuất hiện nhiều lần ở trên: hiểu đơn giản, đó là "cuốn sổ" Hibernate mở ra cho mỗi transaction, ghi lại mọi entity đã load hoặc đã lưu cùng bản chụp giá trị ban đầu của chúng. Trong Spring, sổ được mở khi method `@Transactional` bắt đầu và đóng khi method kết thúc. Entity nằm trong sổ là managed; sổ đóng lại thì các entity đó thành detached.

`findById` truy vấn ngay và trả `Optional.empty()` nếu không có (tương ứng `find` của JPA, `get` của Hibernate). `getReferenceById` trả proxy chưa truy vấn, chỉ ném exception khi truy cập field mà dòng không tồn tại (tương ứng `getReference`; `Session.load()` đã deprecated từ Hibernate 6). Nó hữu ích khi chỉ cần gán quan hệ mà không muốn SELECT: `employee.setDepartment(deptRepo.getReferenceById(1L))`.

**LazyInitializationException** xảy ra khi truy cập quan hệ LAZY chưa tải sau khi persistence context đã đóng.

```java
// Runs in a scheduled job, WITHOUT @Transactional
public String deptNameOf(Long id) {
    Employee e = employeeRepository.findById(id).orElseThrow(); // findById's own transaction is already closed
    return e.getDepartment().getName();   // LAZY proxy: throws LazyInitializationException
}
```

**Giải thích:** khi `findById` trả về, `e` đã detached và `department` chỉ là proxy; `getName()` cần truy vấn DB nhưng không còn session. Cách sửa: đặt `@Transactional(readOnly = true)` lên method, tải sẵn bằng `JOIN FETCH`/`@EntityGraph`, hoặc truy vấn thẳng ra DTO. Trong web request lỗi này thường bị che vì Spring Boot bật mặc định `spring.jpa.open-in-view`; vì sao không nên dựa vào nó và vấn đề N+1 ở Chương 6.

### LazyInitializationException theo từng bước

Diễn lại đoạn code trên theo thứ tự thời gian, với `id = 1` (An, phòng IT):

1. `deptNameOf(1)` bắt đầu. Method không có `@Transactional` nên chưa có persistence context nào.
2. `findById(1)` là method của Spring Data, tự có transaction riêng: mở sổ, chạy `select ... from employees where id = ?`, tạo object An, field `department` là proxy chỉ chứa `id = 1`.
3. `findById` trả về, transaction của nó commit và **đóng sổ**. An giờ là detached, proxy phòng ban mất đường liên lạc với DB.
4. `e.getDepartment()` trả proxy, chưa có gì xảy ra vì lấy proxy không cần DB.
5. `.getName()` cần dữ liệu thật, proxy cố chạy `select ... from departments where id = ?` nhưng không còn session, ném `org.hibernate.LazyInitializationException: could not initialize proxy [com.corp.hr.Department#1] - no Session`.

Bản sửa đơn giản nhất cho trường hợp này là giữ sổ mở trong suốt method:

```java
@Transactional(readOnly = true)           // one persistence context for the whole method
public String deptNameOf(Long id) {
    Employee e = employeeRepository.findById(id).orElseThrow(); // joins this transaction
    return e.getDepartment().getName();   // proxy loads via a second SELECT: "IT"
}
```

**Giải thích:** giờ bước 3 không đóng sổ nữa, vì `findById` tham gia vào transaction đang có của `deptNameOf`. Ở bước 5 proxy chạy được câu SELECT thứ hai và trả `"IT"`. Nếu biết trước chắc chắn cần phòng ban, dùng `@Query` với `JOIN FETCH` để lấy cả hai trong một câu, tránh thêm một vòng đi DB.

### Câu hỏi (Cơ bản): Hibernate có mấy cấp cache?

Cache cấp 1 gắn với persistence context, luôn bật: trong cùng transaction, `find` cùng id hai lần chỉ truy vấn một lần. Cache cấp 2 dùng chung toàn ứng dụng, mặc định tắt, cần provider (Ehcache, Infinispan) và chỉ hợp với dữ liệu ít thay đổi.

### Câu hỏi (Cơ bản): JPA, Hibernate và Spring Data JPA khác nhau thế nào?

**JPA là bản đặc tả (các interface và annotation như `@Entity`, `EntityManager`), Hibernate là thư viện cài đặt đặc tả đó, Spring Data JPA là lớp trên cùng tự sinh repository từ interface.** So sánh: JPA giống bộ luật giao thông, Hibernate là chiếc xe chạy theo luật, Spring Data JPA là tài xế đưa bạn đi chỉ cần nói điểm đến (`findByEmail`). Code dùng annotation `jakarta.persistence` về lý thuyết đổi được sang implementation khác (EclipseLink), còn khi dùng API riêng của Hibernate (`Session`) thì gắn chặt với Hibernate.

### Câu hỏi (Đọc code): Method dưới chạy mấy câu SQL, và lương của An sau cùng là bao nhiêu?

```java
@Transactional
public void raise() {
    Employee a = employeeRepository.findById(1L).orElseThrow();
    Employee b = employeeRepository.findById(1L).orElseThrow();
    a.setSalary(new BigDecimal("2500"));
    System.out.println(a == b);
}
```

**Đáp án:**

**Chạy hai câu SQL: một SELECT và một UPDATE; in `true`; lương An sau commit là 2500 dù không gọi `save`.** Lần `findById` thứ hai tìm thấy An trong persistence context (cache cấp 1) nên không truy vấn lại và trả **đúng object cũ**, vì thế `a == b`. `a` đang managed, nên khi method kết thúc và transaction commit, dirty checking so với bản chụp, thấy `salary` đổi và tự sinh `UPDATE employees set ... where id = ?`. Bỏ `@Transactional` thì hai `findById` chạy hai SELECT, `a == b` là `false`, và thay đổi lương không được lưu.

### Câu hỏi (Đọc code): Đoạn dưới chuyển Chi sang phòng IT nhưng DB không đổi. Vì sao?

```java
@Transactional
public void moveToIt(Long empId) {
    Department it = departmentRepository.findById(1L).orElseThrow();
    Employee chi = employeeRepository.findById(empId).orElseThrow();
    it.getEmployees().add(chi);           // only the inverse side is updated
}
```

**Đáp án:**

**Code chỉ sửa phía nghịch `Department.employees` (có `mappedBy`), còn Hibernate chỉ đọc phía owning `Employee.department` để ghi cột `department_id`.** Transaction commit, Hibernate không thấy owning side đổi nên không sinh UPDATE nào. Sửa: gọi `chi.setDepartment(it)`. Thực tế nên viết helper `addEmployee(Employee e)` trong `Department` cập nhật cả hai phía (`employees.add(e); e.setDepartment(this);`) để object trong bộ nhớ và DB luôn khớp.

### Câu hỏi (Thực chiến): Endpoint trả danh sách nhân viên kèm tên phòng chạy tốt khi test, lên production thì log có hàng trăm câu `select ... from departments where id = ?` cho một request. Chuyện gì xảy ra?

**Đây là N+1 query: một câu lấy N nhân viên, rồi mỗi lần truy cập `getDepartment().getName()` trên từng nhân viên sinh thêm một câu SELECT phòng ban.** Dữ liệu test ít nên không nhận ra; production có hàng trăm dòng là hàng trăm vòng đi DB. Nó "chạy được" chứ không ném `LazyInitializationException` vì `open-in-view` giữ session mở tới lúc Jackson serialize. Sửa: viết `@Query("SELECT e FROM Employee e JOIN FETCH e.department")` hoặc `@EntityGraph(attributePaths = "department")` để lấy cả hai trong một câu, hoặc truy vấn thẳng ra DTO. Chi tiết N+1 và các cách đo ở Chương 6.

## N2.12 Design pattern hay hỏi ở mức Fresher

Mỗi pattern bạn cần định nghĩa được, viết ví dụ ngắn và chỉ ra nơi gặp trong Java/Spring. Phân tích sâu ở Chương 10.

**Design pattern** (mẫu thiết kế) là lời giải đã được đặt tên cho một vấn đề thiết kế hay lặp lại. Giá trị lớn nhất của nó là **tên gọi chung**: nói "ở đây dùng Strategy" thì cả nhóm hiểu ngay cấu trúc, không cần vẽ lại. Người mới nên học theo câu hỏi "pattern này giải quyết vấn đề gì" trước, cấu trúc class sau.

> [!RECALL]
> Các pattern dưới dựa nhiều vào kiến thức Nền tảng 1: constructor `private` và biến `static final` (N1.3, N1.4) cho Singleton; interface và đa hình (N1.5, N1.7) cho Factory, Strategy; lambda và functional interface như `Consumer` (N1.15) cho Observer và Strategy viết gọn.

**Singleton**: đảm bảo class chỉ có một instance và một điểm truy cập toàn cục. Cách thread-safe gọn nhất (ngoài `enum`) là holder idiom.

```java
public final class IdGenerator {
    private long counter;
    private IdGenerator() {}                           // blocks new from outside

    private static class Holder {                      // loaded only when getInstance() is first called
        static final IdGenerator INSTANCE = new IdGenerator();
    }
    public static IdGenerator getInstance() { return Holder.INSTANCE; }
    public synchronized long next() { return ++counter; }
}
```

**Giải thích:** constructor `private` nên không ai `new` được; JVM chỉ nạp `Holder` khi `getInstance()` gọi lần đầu và đảm bảo khởi tạo class là thread-safe, nên có lazy loading mà không cần khóa. Gặp trong `Runtime.getRuntime()`. Singleton bean của Spring khác: một instance mỗi container, không phải mỗi ClassLoader.

**Factory**: gom logic tạo object vào một chỗ, bên gọi chỉ nói cần loại gì.

```java
interface Notifier { String send(String msg); }
record EmailNotifier() implements Notifier { public String send(String m) { return "Email: " + m; } }
record SmsNotifier() implements Notifier { public String send(String m) { return "SMS: " + m; } }

final class NotifierFactory {
    static Notifier create(String channel) {
        return switch (channel) {                      // the ONLY place that knows concrete classes
            case "email" -> new EmailNotifier();
            case "sms" -> new SmsNotifier();
            default -> throw new IllegalArgumentException("Kênh không hỗ trợ: " + channel);
        };
    }
}
```

**Giải thích:** `NotifierFactory.create("sms").send("Hi")` trả `SMS: Hi`; thêm kênh mới chỉ sửa factory, nơi gọi giữ nguyên. Gặp trong `List.of()`, `LocalDate.of()`, `NumberFormat.getInstance()`; bản thân Spring là một factory lớn (`BeanFactory`, method `@Bean`).

**Builder**: tạo object nhiều tham số, nhất là tham số tùy chọn, bằng các lời gọi có tên.

```java
public record Email(String to, String subject) {
    public static class Builder {
        private String to, subject = "(không tiêu đề)";            // default value
        public Builder to(String v) { to = v; return this; }        // return this for chaining
        public Builder subject(String v) { subject = v; return this; }
        public Email build() {
            if (to == null) throw new IllegalStateException("Thiếu người nhận");
            return new Email(to, subject);
        }
    }
}
```

**Giải thích:** `new Email.Builder().to("an@corp.vn").build()` đọc là hiểu, field không gán lấy mặc định, và `build()` kiểm tra hợp lệ một lần trước khi tạo object bất biến. Gặp trong `StringBuilder`, `HttpClient.newBuilder()`, `ResponseEntity.status(...).body(...)`, `@Builder` của Lombok.

**Observer**: một đối tượng phát sự kiện, nhiều đối tượng đăng ký nhận, hai bên không phụ thuộc trực tiếp.

```java
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class EventBus {
    private final List<Consumer<String>> listeners = new ArrayList<>();
    public void subscribe(Consumer<String> l) { listeners.add(l); }
    public void publish(String event) { listeners.forEach(l -> l.accept(event)); }  // notify every listener
}
```

**Giải thích:** đăng ký hai listener (gửi email chào mừng, cấp tài khoản) rồi gọi `bus.publish("An")` thì cả hai cùng chạy. Bên phát không biết có bao nhiêu listener; thêm việc mới chỉ cần `subscribe` thêm. Trong Spring là `ApplicationEventPublisher` cùng `@EventListener`; lớp `java.util.Observable` cũ đã deprecated từ Java 9.

Đoạn dưới là bản chạy được của đúng tình huống vừa mô tả, gộp bus và hai listener vào một file:

```java
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class EventBusDemo {
    private final List<Consumer<String>> listeners = new ArrayList<>();
    void subscribe(Consumer<String> l) { listeners.add(l); }
    void publish(String event) { listeners.forEach(l -> l.accept(event)); }

    public static void main(String[] args) {
        EventBusDemo bus = new EventBusDemo();
        bus.subscribe(name -> System.out.println("Send welcome email to " + name));
        bus.subscribe(name -> System.out.println("Create account for " + name));
        bus.publish("An");
        // prints: Send welcome email to An | Create account for An
    }
}
```

**Giải thích:** hai listener chạy theo thứ tự đăng ký, in hai dòng. Code gọi `publish("An")` (ví dụ service tuyển dụng) không hề biết có gửi email hay tạo tài khoản; thêm listener thứ ba "báo cho phòng IT cấp máy" không phải sửa dòng nào ở phía phát. Đây là Observer chạy **đồng bộ** trên cùng thread: listener đầu ném exception thì listener sau không chạy, điều mà `@EventListener` của Spring cũng giữ nguyên nếu không bật `@Async`.

**Facade**: một giao diện đơn giản che nhiều hệ thống con phía sau.

```java
class PayrollCalculator { long calc(long empId) { return 1500; } }
class PayslipRenderer { String render(long amount) { return "PDF " + amount; } }
class MailClient { void send(String to, String file) { System.out.println(to + " <- " + file); } }

public class PayrollFacade {
    public void sendPayslip(long empId, String email) {       // the caller needs just one method
        long amount = new PayrollCalculator().calc(empId);
        new MailClient().send(email, new PayslipRenderer().render(amount));
    }
}
```

**Giải thích:** controller gọi `sendPayslip(1, "an@corp.vn")` thay vì tự phối hợp ba class đúng thứ tự; đổi thư viện gửi mail chỉ ảnh hưởng bên trong facade. Gặp trong SLF4J (facade chung trên Logback, Log4j2) và `JdbcTemplate` che JDBC thô.

**Strategy**: đóng gói từng thuật toán thành class riêng cùng interface để đổi lúc chạy, thay cho `if-else`.

```java
import java.math.BigDecimal;

interface DiscountStrategy { BigDecimal apply(BigDecimal price); }

record PercentDiscount(int percent) implements DiscountStrategy {       // one class per algorithm
    public BigDecimal apply(BigDecimal p) {
        return p.multiply(BigDecimal.valueOf(100 - percent)).divide(BigDecimal.valueOf(100));
    }
}
```

**Giải thích:** `new PercentDiscount(10).apply(new BigDecimal("200"))` trả 180. Code thanh toán chỉ nhận một `DiscountStrategy` và gọi `apply`, không cần biết đang giảm kiểu gì; thêm "giảm cố định 50k" là thêm class mới, không sửa code cũ. Gặp trong `Comparator` truyền vào `sort()`; trong Spring, tiêm `Map<String, DiscountStrategy>` rồi chọn theo key (Chương 10).

Vì `DiscountStrategy` chỉ có một method abstract, nó là functional interface và mỗi chiến lược có thể viết bằng lambda. Đoạn dưới chọn chiến lược theo mã khuyến mãi lúc chạy, không có `if-else` nào:

```java
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

interface DiscountStrategy { BigDecimal apply(BigDecimal price); }

public class CheckoutDemo {
    public static void main(String[] args) {
        Map<String, DiscountStrategy> strategies = Map.of(
            "NONE", p -> p,
            "PERCENT10", p -> p.multiply(new BigDecimal("0.9")),
            "FIXED50", p -> p.subtract(new BigDecimal("50")));
        BigDecimal price = new BigDecimal("200");
        for (String code : List.of("NONE", "PERCENT10", "FIXED50")) {
            System.out.println(code + " -> " + strategies.get(code).apply(price));
        }
        // prints: NONE -> 200 | PERCENT10 -> 180.0 | FIXED50 -> 150
    }
}
```

**Giải thích:** in `NONE -> 200`, `PERCENT10 -> 180.0`, `FIXED50 -> 150`. `180.0` có một chữ số thập phân vì `BigDecimal.multiply` cộng scale của hai số (0 + 1). Thêm mã khuyến mãi mới là thêm một dòng vào `Map`, vòng lặp giữ nguyên. Trong Spring, map này không cần viết tay: khai báo mỗi chiến lược là một bean có tên, rồi inject `Map<String, DiscountStrategy>` như cách sửa thứ ba của `NoUniqueBeanDefinitionException` ở N2.7.

### Câu hỏi (Cơ bản): Factory khác Builder thế nào?

Factory quyết định **tạo class nào**, trả object hoàn chỉnh trong một lời gọi. Builder quyết định **tạo object như thế nào** khi có nhiều tham số, lắp dần rồi `build()`.

### Câu hỏi (Đọc code): Đoạn code dưới in ra gì?

```java
public class SingletonQuiz {
    static final class Counter {
        private static final Counter INSTANCE = new Counter();
        private int value;
        private Counter() {}
        static Counter get() { return INSTANCE; }
        int next() { return ++value; }
    }

    public static void main(String[] args) {
        Counter a = Counter.get();
        Counter b = Counter.get();
        a.next();
        b.next();
        System.out.println(a == b);
        System.out.println(b.next());
    }
}
```

**Đáp án:**

In `true` rồi `3`. `a` và `b` là cùng một object `INSTANCE`, nên `a == b` là `true`, và ba lần `next()` (qua `a` một lần, qua `b` hai lần) cùng tăng một biến `value`: 1, 2, 3. Đây là Singleton kiểu eager: object được tạo ngay khi class `Counter` được nạp, thread-safe nhờ JVM. Lưu ý `next()` ở đây không `synchronized`, nên nếu nhiều thread cùng gọi thì có thể mất lượt tăng (N1.13), khác với `IdGenerator` ở trên.

### Câu hỏi (Hiểu sâu): Strategy khác gì so với một khối `if-else` theo loại? Khi nào `if-else` vẫn ổn?

**Strategy tách mỗi nhánh thành một class (hoặc lambda) riêng sau một interface, nên thêm nhánh mới không phải sửa code đang chạy; `if-else` gom mọi nhánh vào một method, thêm nhánh là sửa method đó.** Khi có 2–3 nhánh đơn giản và ít thay đổi, `if-else` hay `switch` vẫn dễ đọc hơn, tạo thêm interface và năm class là over-engineering. Chuyển sang Strategy khi số nhánh tăng dần theo thời gian, mỗi nhánh có logic dài, cần test riêng từng nhánh, hoặc cần chọn nhánh theo cấu hình lúc chạy.

### Câu hỏi (Hiểu sâu): Spring áp dụng Singleton, Factory, Proxy và Observer ở đâu?

**Mỗi pattern đều có mặt trong những thứ bạn đã dùng ở các mục trước.** Singleton: scope mặc định của bean, một instance mỗi container (N2.7). Factory: `ApplicationContext`/`BeanFactory` tạo bean, method `@Bean` là factory method. Proxy: `@Transactional`, `@Cacheable` và aspect ở N2.10 đều chạy qua proxy bọc quanh bean thật. Observer: `ApplicationEventPublisher.publishEvent(...)` và `@EventListener`. Ngoài ra `JdbcTemplate` là Template Method kết hợp Facade, còn `HandlerMapping` trong DispatcherServlet (N2.6) là một dạng Strategy.

## N2.13 Git và Linux cơ bản

**Git** là công cụ quản lý phiên bản: lưu lại lịch sử mọi thay đổi của mã nguồn dưới dạng các **commit** (mỗi commit là một bản chụp toàn bộ dự án kèm lời mô tả), cho phép nhiều người làm song song trên các **nhánh** (branch) rồi gộp lại. **Repository** (repo) là thư mục dự án cộng toàn bộ lịch sử đó; bản trên máy bạn là local, bản trên GitHub/GitLab là **remote**, thường tên `origin`.

Luồng Git hằng ngày trên một nhánh tính năng:

```bash
git clone https://git.corp.vn/hr/employee-service.git
git switch -c feature/salary-api        # create a new branch and switch to it (old way: git checkout -b)
git add src/                            # move changes into the staging area
git commit -m "Add salary API"          # save a snapshot into local history
git fetch origin                        # download new commits from remote, NOT merged yet
git merge origin/main                   # merge the latest main into the current branch
git push -u origin feature/salary-api   # push to remote, then open a pull request
```

**Giải thích:** thay đổi đi qua working directory, staging area (sau `add`), local repository (sau `commit`), rồi lên remote (sau `push`). `git pull` bằng `fetch` cộng `merge` (hoặc rebase nếu cấu hình); `fetch` riêng cho bạn xem trước rồi mới gộp.

Lệnh bạn nên gõ nhiều nhất là `git status`, vì nó cho biết từng file đang ở vùng nào. Output mẫu khi đã `add` một file và còn sửa một file khác chưa `add`:

```bash
git status
# On branch feature/salary-api
# Changes to be committed:
#   (use "git restore --staged <file>..." to unstage)
# 	modified:   src/main/java/com/corp/hr/SalaryController.java
#
# Changes not staged for commit:
#   (use "git add <file>..." to update what will be committed)
# 	modified:   src/main/resources/application.yml

git log --oneline -3
# 9c1e2f4 (HEAD -> feature/salary-api) Add salary API
# 51ab0d7 (origin/main, main) Fix email validation
# 3f8d9aa Add employee CRUD
```

**Giải thích:** "Changes to be committed" là staging area: `SalaryController.java` sẽ nằm trong commit tới. "Changes not staged" là working directory: `application.yml` đã sửa nhưng sẽ **không** vào commit tới nếu không `add`. Đây là cách tránh vô tình commit file cấu hình chứa mật khẩu. `git log --oneline` in mỗi commit một dòng: mã hash rút gọn, nhãn nhánh đang trỏ tới, lời mô tả; `HEAD` là vị trí bạn đang đứng.

Khi hai người sửa cùng một dòng, merge dừng lại và đánh dấu conflict trong file:

```text
<<<<<<< HEAD
    private static final int PAGE_SIZE = 20;
=======
    private static final int PAGE_SIZE = 50;
>>>>>>> origin/main
```

**Giải thích:** phần trên `=======` là code nhánh của bạn, phần dưới là code từ nhánh đang gộp vào. Chọn một bên hoặc kết hợp, xóa ba dòng đánh dấu, chạy build và test, rồi `git add`, `git commit`; muốn bỏ dở thì `git merge --abort`. Chưa chắc logic bên kia thì hỏi người viết.

Trước khi thấy các dấu đó trong file, bạn sẽ thấy Git báo ngay trên terminal lúc merge:

```bash
git merge origin/main
# Auto-merging src/main/java/com/corp/hr/PageConfig.java
# CONFLICT (content): Merge conflict in src/main/java/com/corp/hr/PageConfig.java
# Automatic merge failed; fix conflicts and then commit the result.
```

**Giải thích:** Git tự gộp được mọi file khác, chỉ dừng ở file mà hai bên sửa cùng chỗ. Lúc này `git status` liệt kê file đó dưới mục "Unmerged paths"; bạn sửa như hướng dẫn ở trên, `git add` file đó để báo "đã giải quyết", rồi `git commit` để hoàn tất merge.

| Việc cần làm | Lệnh | Ghi chú |
|---|---|---|
| Theo dõi log realtime | `tail -f app.log` | Ctrl+C để thoát |
| Tìm lỗi trong log | `grep -n -A 20 "ERROR" app.log` | In thêm 20 dòng sau để thấy stack trace |
| Xem file lớn | `less app.log` | `/` tìm, `G` xuống cuối, `q` thoát |
| Đặt biến môi trường | `export SPRING_PROFILES_ACTIVE=prod` | Chỉ trong phiên shell hiện tại |
| Chạy script | `chmod +x start.sh` rồi `./start.sh` | Cấp quyền thực thi trước |
| Tìm tiến trình | `ps -ef` kết hợp `grep java` | Lấy PID |
| Dừng tiến trình | `kill <PID>` | `kill -9` chỉ khi treo hẳn |
| Dung lượng đĩa, thư mục | `df -h`, `du -sh logs/` | Đĩa đầy là lỗi kinh điển |

Biến đặt bằng `export` được truyền cho tiến trình con nhưng mất khi đóng phiên; muốn lâu dài thì ghi vào `~/.bashrc` hoặc cấu hình service. `kill` mặc định gửi SIGTERM để Spring Boot tắt êm; `kill -9` giết ngay, không dọn dẹp.

Bảng trên dễ quên nếu chưa từng thấy output. Dưới đây là một phiên điều tra điển hình khi ứng dụng báo lỗi trên server, kèm output mẫu (rút gọn):

```bash
ps -ef | grep java
# app  24817     1  3 09:12 ?  00:04:31 java -jar employee-service.jar
# app  25102 25011  0 10:40 pts/0 00:00:00 grep --color=auto java

grep -n -A 3 "ERROR" app.log
# 1842:2026-09-24 10:31:07 ERROR c.c.hr.EmployeeController : Request failed
# 1843-org.springframework.dao.DataIntegrityViolationException: could not execute statement
# 1844-	at org.hibernate.exception.internal.SQLStateConversionDelegate.convert(...)
# 1845-	at com.corp.hr.EmployeeService.create(EmployeeService.java:27)

df -h /
# Filesystem  Size  Used Avail Use% Mounted on
# /dev/sda1    50G   49G  1.0G  98% /

du -sh logs/
# 38G	logs/
```

**Giải thích:** `ps -ef | grep java` cho PID của ứng dụng là **24817** (cột thứ hai); dòng thứ hai là chính lệnh `grep` vừa chạy, bỏ qua. `grep -n -A 3` in số dòng (`1842:`) và 3 dòng sau mỗi dòng khớp (đánh dấu bằng `-`), đủ để thấy tên exception và dòng code gây lỗi `EmployeeService.java:27`. `df -h` cho thấy ổ đĩa đầy 98%, `du -sh logs/` chỉ ra thủ phạm là 38G log không được xoay vòng: ứng dụng sẽ sớm không ghi được file và lỗi hàng loạt. Dừng êm bằng `kill 24817`.

### Câu hỏi (Cơ bản): `git fetch` khác `git pull` thế nào?

**`git fetch` chỉ tải commit mới từ remote về và cập nhật các nhánh `origin/*`, không đụng tới code bạn đang làm; `git pull` là `fetch` rồi gộp luôn (merge hoặc rebase) vào nhánh hiện tại.** Tôi dùng `fetch` khi muốn xem trước người khác đã đẩy gì (`git log HEAD..origin/main`) rồi mới quyết định gộp. `pull` tiện hơn nhưng có thể bất ngờ sinh conflict hoặc merge commit khi bạn đang dở tay.

### Câu hỏi (Thực chiến): Merge `main` vào nhánh của bạn thì gặp conflict ở file cấu hình `PAGE_SIZE`. Bạn xử lý thế nào?

**Đọc cả hai phiên bản, hiểu vì sao bên kia đổi, chọn hoặc kết hợp, xóa dấu conflict, build và chạy test, rồi `git add` và `git commit`.** Cụ thể: `git status` xem file nào conflict; mở file, phần giữa `<<<<<<< HEAD` và `=======` là của mình, phần tới `>>>>>>>` là của `main`; nếu không rõ vì sao `main` đổi 20 thành 50 thì `git log -p origin/main -- <file>` hoặc hỏi người sửa. Không bao giờ chọn bừa "giữ của mình" để cho xong, vì làm vậy âm thầm xóa thay đổi của đồng nghiệp. Làm rối quá thì `git merge --abort` để quay về trước khi merge.

### Câu hỏi (Hiểu sâu): `kill` khác `kill -9` thế nào, vì sao nên thử `kill` trước?

**`kill <PID>` gửi tín hiệu SIGTERM, cho ứng dụng cơ hội tắt êm; `kill -9` gửi SIGKILL, hệ điều hành giết ngay, ứng dụng không chạy thêm được dòng code nào.** Nhận SIGTERM, Spring Boot ngừng nhận request mới, chờ request đang chạy xong (khi bật graceful shutdown), commit hoặc rollback transaction, đóng connection pool, ghi nốt log. `kill -9` cắt ngang tất cả: request đang xử lý bị đứt, file có thể ghi dở. Chỉ dùng `-9` khi tiến trình treo, không phản hồi SIGTERM sau một khoảng chờ hợp lý.

### Câu hỏi (Thực chiến): Ứng dụng trên server Linux đột nhiên lỗi hàng loạt, log báo `No space left on device`. Bạn làm gì?

**Xác nhận đĩa đầy bằng `df -h`, tìm thư mục chiếm chỗ bằng `du -sh`, giải phóng chỗ an toàn, rồi sửa gốc rễ là cấu hình xoay vòng log.** Cụ thể: `df -h` thấy phân vùng 100%; `du -sh /var/log/* logs/*` tìm thủ phạm, thường là file log hoặc heap dump; nén hoặc xóa log cũ (file log đang được ghi thì làm rỗng bằng `truncate -s 0 app.log` thay vì `rm`, vì tiến trình vẫn giữ file đã xóa và không trả lại dung lượng). Sau đó cấu hình `logging.logback.rollingpolicy.max-history` và `total-size-cap` trong Spring Boot, hoặc logrotate, để không lặp lại.

## N2.14 Công nghệ cũ vẫn có thể bị hỏi

Các công nghệ dưới ít gặp trong dự án mới nhưng còn trong bộ câu hỏi của nhiều công ty; chỉ cần trả lời ở mức "biết là gì".

- **EJB**: mô hình component phía server của Java EE (nay là Jakarta EE), chạy trong application server như WildFly, WebLogic. Gồm Session Bean (Stateless, Stateful, Singleton) và Message-Driven Bean xử lý message JMS; Entity Bean đã bị thay bằng JPA entity từ EJB 3.0. Spring ra đời để thay EJB 2 nặng nề, khó test.
- **SOAP và WSDL**: SOAP trao đổi message XML bọc trong envelope; WSDL là file XML mô tả operation, kiểu dữ liệu, endpoint, từ đó sinh code client (JAX-WS, Apache CXF, Spring Web Services).
- **XML, XSD, XSLT**: XSD định nghĩa cấu trúc hợp lệ của XML (well-formed là đúng cú pháp, valid là khớp XSD); XSLT biến đổi XML sang HTML hoặc XML khác. Java đọc XML bằng DOM (nạp cả cây) hoặc SAX (duyệt theo sự kiện).
- **JAXB**: map XML với object qua `@XmlRootElement`; object sang XML là marshal, ngược lại là unmarshal. JAXB **đã bị gỡ khỏi JDK từ Java 11** (JEP 320), nay thêm dependency `jakarta.xml.bind-api` kèm runtime, package `jakarta.xml.bind`.
- **JAX-RS, Jersey, WADL**: JAX-RS là chuẩn Jakarta EE cho REST (`@Path`, `@GET`), Jersey là implementation; Spring MVC dùng annotation riêng. WADL gần như không còn dùng, đã được thay bằng OpenAPI/Swagger.

Để hình dung SOAP "nặng" hơn REST ra sao, so sánh cùng một yêu cầu "lấy nhân viên số 5" ở hai kiểu. REST chỉ cần `GET /api/employees/5`. SOAP phải gửi `POST` tới một endpoint chung với body XML bọc trong envelope:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:hr="http://corp.vn/hr">
  <soap:Header/>                          <!-- security, transaction info go here -->
  <soap:Body>
    <hr:GetEmployeeRequest>
      <hr:id>5</hr:id>                    <!-- the actual parameter -->
    </hr:GetEmployeeRequest>
  </soap:Body>
</soap:Envelope>
```

**Giải thích:** toàn bộ ý nghĩa "lấy nhân viên 5" nằm trong tên phần tử `GetEmployeeRequest`, không nằm ở HTTP method hay URL như REST. Tên phần tử, kiểu dữ liệu của `id` được WSDL/XSD quy định chặt, nên công cụ sinh được code client tự động, đổi lại message dài và khó đọc hơn nhiều. Đó là lý do SOAP còn sống ở ngân hàng, bảo hiểm, nơi hợp đồng chặt được ưu tiên hơn sự gọn nhẹ.

> [!TIP]
> Bị hỏi về công nghệ chưa dùng, hãy nói thật: định nghĩa ngắn, nó giải quyết vấn đề gì, cái gì đang thay thế nó. "Em chưa làm với EJB, nhưng em hiểu nó là... và trong Spring em dùng... cho vai trò tương tự" ghi điểm hơn câu thuộc lòng.

### Câu hỏi (Cơ bản): XML well-formed khác valid thế nào?

**Well-formed là đúng cú pháp XML (thẻ đóng mở khớp, có đúng một phần tử gốc, thuộc tính có ngoặc kép); valid là vừa well-formed vừa khớp với schema XSD (đúng tên phần tử, thứ tự, kiểu dữ liệu).** Ví dụ `<id>abc</id>` well-formed nhưng không valid nếu XSD quy định `id` là số nguyên. Mọi XML valid đều well-formed, điều ngược lại không đúng.

### Câu hỏi (Thực chiến): Nâng cấp dự án từ Java 8 lên Java 17, code dùng JAXB báo `package javax.xml.bind does not exist`. Vì sao và sửa thế nào?

**JAXB đã bị gỡ khỏi JDK từ Java 11 (JEP 320), nên các package `javax.xml.bind` không còn sẵn trong JDK.** Sửa: thêm dependency `jakarta.xml.bind:jakarta.xml.bind-api` và một runtime như `org.glassfish.jaxb:jaxb-runtime`, rồi đổi import từ `javax.xml.bind` sang `jakarta.xml.bind` (Spring Boot 3 đã dùng không gian tên jakarta). Cùng đợt gỡ đó còn có JAX-WS và CORBA, nên dự án gọi SOAP cũng cần thêm dependency tương tự.

### Câu hỏi (Hiểu sâu): Spring khác EJB ở điểm nào khiến nó thay thế được EJB?

**Spring cho phép dùng class Java bình thường (POJO) và chạy ở bất cứ đâu, còn EJB 2 bắt class kế thừa interface đặc thù và phải chạy trong application server nặng.** Với EJB 2, muốn test một service phải khởi động cả server; với Spring, service chỉ là class có constructor, test bằng `new` và mock (đúng lợi ích của DI ở N2.7). Spring cũng mang lại transaction khai báo, bảo mật, remoting mà EJB có, nhưng qua AOP proxy (N2.10). EJB 3 về sau học lại nhiều ý tưởng này và nhẹ hơn hẳn, nhưng lúc đó Spring đã phổ biến.

## N2.15 Tóm tắt trọng tâm

- Khóa chính định danh mỗi dòng, khóa ngoại trỏ tới dòng có thật ở bảng khác, và ràng buộc là lớp bảo vệ cuối cùng vì dữ liệu có thể được ghi từ nhiều nơi ngoài code Java.
- So sánh với NULL phải dùng `IS NULL`, vì `= NULL`, `<> 1` hay `NOT IN (..., NULL)` đều cho UNKNOWN và âm thầm loại dòng khỏi kết quả mà không báo lỗi.
- INNER JOIN bỏ dòng không có cặp, LEFT JOIN giữ mọi dòng bảng trái, nên chọn loại JOIN theo câu hỏi nghiệp vụ "tất cả X" hay "chỉ những X có Y".
- Điều kiện trên bảng phải của LEFT JOIN đặt ở `ON` chứ không ở `WHERE`, vì đặt ở `WHERE` sẽ loại các dòng NULL và biến LEFT JOIN thành INNER JOIN.
- WHERE lọc dòng trước khi gom, HAVING lọc nhóm sau khi gom, và `COUNT(cột)` bỏ qua NULL còn `COUNT(*)` thì không, nên đếm sau LEFT JOIN phải dùng `COUNT(cột)`.
- Index như mục lục sách: đọc nhanh hơn vì không phải quét cả bảng, nhưng tốn chỗ và làm chậm mọi lần ghi, nên chỉ index cột thật sự dùng để lọc và kiểm chứng bằng EXPLAIN.
- Transaction gom nhiều lệnh thành tất cả hoặc không gì cả, vì chạy từng lệnh ở chế độ autocommit có thể làm tiền bị trừ mà không được cộng khi lỗi giữa chừng.
- HTTP là stateless nên mỗi request phải tự mang danh tính (cookie chứa session id hoặc token), và status code phải phản ánh đúng kết quả vì máy client dựa vào nó để quyết định.
- Mọi request vào Spring MVC đi qua Tomcat, Filter, DispatcherServlet rồi mới tới controller, và controller là singleton dùng chung cho nhiều thread nên không được giữ dữ liệu theo request trong field.
- DI nghĩa là class nhận dependency qua constructor thay vì tự `new`, vì nhờ vậy thay được implementation khi test và khi đổi hạ tầng mà không sửa class.
- Có nhiều bean cùng kiểu thì Spring báo `NoUniqueBeanDefinitionException` ngay lúc khởi động, sửa bằng `@Primary`, `@Qualifier` hoặc inject cả `List`/`Map`.
- Thiếu `@Valid` thì các annotation validation bị bỏ qua mà không có lỗi nào, nên dữ liệu rác lọt vào tới DB.
- Spring AOP, `@Transactional` và `@Cacheable` chạy qua proxy, nên lời gọi nội bộ `this.method()` không đi qua proxy và mất tác dụng.
- Entity cần constructor không tham số vì Hibernate tạo object bằng reflection, và chỉ phía owning (có `@JoinColumn`) mới quyết định giá trị cột khóa ngoại.
- Quan hệ LAZY chỉ tải được khi persistence context còn mở, nên truy cập sau khi transaction đóng sẽ ném `LazyInitializationException`, còn truy cập trong vòng lặp dễ sinh N+1 query.

## N2.16 Checklist ôn tập

- [ ] Viết DDL đủ loại ràng buộc; giải thích đúng composite key.
- [ ] Vẽ được kết quả các loại JOIN; phân biệt WHERE vs HAVING, `COUNT(*)` vs `COUNT(cột)`, `NOT IN` vs `NOT EXISTS`.
- [ ] Viết câu tìm trùng và lương cao thứ hai; phân biệt DELETE/TRUNCATE/DROP, UNION/UNION ALL, biết view.
- [ ] Nói được index, 1NF/2NF/3NF qua ví dụ, ACID mỗi chữ một câu.
- [ ] Mô tả HTTP request/response, status code, GET vs POST, cookie vs session; kể luồng request qua DispatcherServlet.
- [ ] Giải thích IoC/DI bằng ví dụ; dùng đúng stereotype, `@Bean`, `@Primary`/`@Qualifier`, 6 scope, profile.
- [ ] Tự viết CRUD Entity, Repository, Service, Controller với `@Valid` và `@RestControllerAdvice`.
- [ ] Nói được Spring Boot khác Spring ở đâu, đọc `pom.xml`; giải thích các khái niệm AOP qua ví dụ logging.
- [ ] Map quan hệ với owning side, nhớ fetch mặc định; kể 4 trạng thái entity; giải thích LazyInitializationException.
- [ ] Viết ví dụ ngắn cho Singleton, Factory, Builder, Observer, Facade, Strategy và chỉ ra nơi gặp.
- [ ] Dùng Git (branch, commit, fetch vs pull, merge, conflict) và các lệnh Linux đọc log, quản lý tiến trình.
- [ ] Trả lời ngắn về EJB, SOAP/WSDL, XML/XSD/XSLT, JAXB và biết cái gì thay thế chúng.
