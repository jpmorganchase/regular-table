/******************************************************************************
 *
 * Copyright (c) 2020, the Regular Table Authors.
 *
 * This file is part of the Regular Table library, distributed under the terms
 * of the Apache License 2.0.  The full license can be found in the LICENSE
 * file.
 *
 */

describe("file_browser.html", () => {
    const first_tr_selector = "regular-table tbody tr:first-child";
    const first_row_header_icon_selector = `${first_tr_selector} .pd-row-header-icon`;
    const header_th_selector = "regular-table thead th"

    let table;

    async function cell_values_at(cix, rix, ncol, nrow) {
        await page.evaluate(async (table, cix, rix, ncol, nrow) => {
            table.scrollTo(cix, rix, ncol, nrow);
            await table.draw();
        }, table, cix, rix, ncol, nrow);

        return await first_cell_values();
    }

    async function click_col_header(cix, reps, shift) {
        const ths = await page.$$(header_th_selector);

        for (let i = 0; i < reps; i++) {
            if (shift) {
                // shift click the column header
                await page.keyboard.down('Shift');
                await ths[cix].click();
                await page.keyboard.up('Shift');
            } else {
                await ths[cix].click();
            }
        }
    }

    async function first_cell_values() {
        const tr = await page.$(first_tr_selector);
        return await page.evaluate((tr) => Array.from(tr.children).map((x) => x.textContent.trim()), tr);
    }

    async function refresh_page() {
        await page.goto("http://localhost:8081/examples/file_browser.html");
        await page.waitFor("regular-table table tbody tr td");

        table = await page.$("regular-table");
    }

    async function reset_scroll() {
        await page.evaluate(async (table) => {
            await table.draw({reset_scroll_position: true});
        }, table);
    }

    async function toggle_first_row() {
        let first_row_header_icon = await page.$(first_row_header_icon_selector);
        await first_row_header_icon.click();
    }

    async function toggle_row_at(rix, ncol, nrow) {
        await page.evaluate(async (table, rix, ncol, nrow) => {
            table.scrollTo(0, rix, ncol, nrow);
            await table.draw();
        }, table, rix, ncol, nrow);

        await toggle_first_row();
    }

    beforeAll(async () => {
        await page.setViewport({width: 400, height: 100});
    });

    describe("creates a `<table>` body when attached to `document`", () => {
        beforeAll(async () => {
            await refresh_page();
        });

        test("with the correct # of rows", async () => {
            const tbody = await page.$("regular-table tbody");
            const num_rows_rendered = await page.evaluate((tbody) => tbody.children.length, tbody);
            expect(num_rows_rendered).toEqual(5);
        });

        test("with the correct # of columns", async () => {
            const first_tr = await page.$(first_tr_selector);
            const num_cells_rendered = await page.evaluate((first_tr) => first_tr.children.length, first_tr);
            expect(num_cells_rendered).toEqual(4);
        });

        test("with the first row's cell test correct", async () => {
            const cell_values = await first_cell_values();
            expect(cell_values).toEqual([
                "add able/",
                "1/1/1971",
                "dir",
                "false"
            ]);
        });
    });

    describe("scrolls via scrollTo() method", () => {
        beforeAll(async () => {
            await refresh_page();
        });

        test("to (0, 1)", async () => {
            const cell_values = await cell_values_at(0, 1, 4, 100);
            expect(cell_values).toEqual([
                "add baker/",
                "1/2/1971",
                "dir",
                "false",
            ]);
        });

        test("to (0, 79)", async () => {
            const cell_values = await cell_values_at(0, 79, 4, 100);
            expect(cell_values).toEqual([
                "file_76.txt",
                "3/28/1971",
                "text",
                "false",
            ]);
        });
    });

    describe("expands and collapses tree rows", () => {
        beforeAll(async () => {
            await refresh_page();
        });

        describe("expands", () => {
            beforeAll(async () => {
                // expand first directory row
                await toggle_first_row();
            });

            afterAll(async () => {
                await reset_scroll();
            });

            test("expand the first tree row", async () => {
                // test the tree header icon
                const first_row_header_icon = await page.$(first_row_header_icon_selector);
                const icon_text = await page.evaluate((x) => x.innerText, first_row_header_icon);
                expect(icon_text).toEqual("remove");
            });

            test("first row added by expand is correct", async () => {
                // scroll to and test first row added by expand
                const cell_values = await cell_values_at(0, 1, 4, 200);
                expect(cell_values).toEqual([
                    "add able/",
                    "1/1/1972",
                    "dir",
                    "false"
                ]);
            });

            test("last row added by expand is correct", async () => {
                // scroll to and test first row added by expand
                const cell_values = await cell_values_at(0, 100, 4, 200);
                expect(cell_values).toEqual([
                    "add jig/",
                    "1/10/1972",
                    "dir",
                    "false"
                ]);
            });
        });

        describe("collapses", () => {
            beforeAll(async () => {
                // collapse first directory row
                await toggle_first_row();
            });

            afterAll(async () => {
                await reset_scroll();
            });

            test("collapse the first tree row", async () => {
                // test the tree header icon
                first_row_header_icon = await page.$(first_row_header_icon_selector);
                const icon_text = await page.evaluate((x) => x.innerText, first_row_header_icon);
                expect(icon_text).toEqual("add");
            });

            test("collapse restores previous rows", async () => {
                // scroll to and test the next row after the collapsed row
                const cell_values = await cell_values_at(0, 1, 4, 100);
                expect(cell_values).toEqual([
                    "add baker/",
                    "1/2/1971",
                    "dir",
                    "false"
                ]);
            });
        });
    });

    describe("sorts flat filebrowser by one or more columns", () => {
        beforeAll(async () => {
            await refresh_page();
        });

        test("by default, sorts by path, ascending", async () => {
            const vals = [];
            for (let i = 0; i < 10; i++) {
                const cell_values = await cell_values_at(0, i, 4, 100);
                vals.push(cell_values[0]);
            }
            expect(vals).toEqual([
                "add able/",
                "add baker/",
                "add charlie/",
                "add dog/",
                "add easy/",
                "file_0.txt",
                "file_1.txt",
                "file_10.txt",
                "file_11.txt",
                "file_12.txt",
            ]);
        });

        test("sort by a single column correctly, descending", async () => {
            // click twice on the "modified" column
            await click_col_header(1, 2);

            const vals = [];
            for (let i = 0; i < 10; i++) {
                const cell_values = await cell_values_at(0, i, 4, 100);
                vals.push(cell_values[1]);
            }
            expect(vals).toEqual([
                "4/10/1971",
                "4/9/1971",
                "4/8/1971",
                "4/7/1971",
                "4/6/1971",
                "4/5/1971",
                "4/4/1971",
                "4/3/1971",
                "4/2/1971",
                "4/1/1971",
            ]);
        });

        test("sort by two columns correctly, [ascending, descending]", async () => {
            // click one on the "kind" column
            await click_col_header(2, 1);
            // shift-click twice on the "modified" column
            await click_col_header(1, 2, true);

            const vals = [];
            for (let i = 5; i < 15; i++) {
                const cell_values = await cell_values_at(0, i, 4, 100);
                vals.push(cell_values[1]);
            }
            expect(vals).toEqual([
                "1/5/1971",
                "1/4/1971",
                "1/3/1971",
                "1/2/1971",
                "1/1/1971",
                "4/10/1971",
                "4/9/1971",
                "4/8/1971",
                "4/7/1971",
                "4/6/1971",
            ]);
        });
    });

    describe("sorts tree filebrowser", () => {
        beforeEach(async () => {
            await refresh_page();
        });

        test("uses same sort at all levels, sort then expand tree", async () => {
            // click one on the "kind" column
            await click_col_header(2, 1);
            // shift-click twice on the "modified" column
            await click_col_header(1, 2, true);

            // expand the "easy/" dir, then the "easy/easy" dir
            await toggle_row_at(5, 4, 100);
            await toggle_row_at(11, 4, 200);

            const offsets = [200, 106, 12];
            for (const offset of offsets) {
                const vals = [];
                for (let i = 6 + offset; i < 16 + offset; i++) {
                    const cell_values = await cell_values_at(0, i, 4, 300);
                    vals.push(cell_values[0]);
                }
                expect(vals).toEqual([
                    "add dog/",
                    "add charlie/",
                    "add baker/",
                    "add able/",
                    "file_89.txt",
                    "file_88.txt",
                    "file_87.txt",
                    "file_86.txt",
                    "file_85.txt",
                    "file_84.txt",
                ]);
            }
        });

        test("uses same sort at all levels, expand tree then sort", async () => {
            // expand the "easy/" dir, then the "easy/easy" dir
            await toggle_row_at(4, 4, 100);
            await toggle_row_at(9, 4, 200);

            // click one on the "kind" column
            await click_col_header(2, 1);
            // shift-click twice on the "modified" column
            await click_col_header(1, 2, true);

            const offsets = [200, 106, 12];
            for (const offset of offsets) {
                const vals = [];
                for (let i = 6 + offset; i < 16 + offset; i++) {
                    const cell_values = await cell_values_at(0, i, 4, 300);
                    vals.push(cell_values[0]);
                }
                expect(vals).toEqual([
                    "add dog/",
                    "add charlie/",
                    "add baker/",
                    "add able/",
                    "file_89.txt",
                    "file_88.txt",
                    "file_87.txt",
                    "file_86.txt",
                    "file_85.txt",
                    "file_84.txt",
                ]);
            }
        });
    });
});
