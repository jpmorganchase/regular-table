/******************************************************************************
 *
 * Copyright (c) 2020, the Regular Table Authors.
 *
 * This file is part of the Regular Table library, distributed under the terms
 * of the Apache License 2.0.  The full license can be found in the LICENSE
 * file.
 *
 */

import {ViewModel} from "./view_model";
import {ICON_MAP} from "./constants";
import {html} from "./utils.js";

/**
 * <thead> view model.  This model accumulates state in the form of
 * column_sizes, which leverages <tables> autosize behavior across
 * virtual pages.
 *
 * @class RegularHeaderViewModel
 */
export class RegularHeaderViewModel extends ViewModel {
    _draw_group_th(offset_cache, d, column, sort_dir) {
        const th = this._get_cell("TH", d, offset_cache[d]);
        offset_cache[d] += 1;
        th.removeAttribute("colspan");
        th.style.minWidth = "0";
        if (sort_dir?.length === 0) {
            th.innerHTML = html`
                <span>${column}</span>
                <span class="pd-column-resize"></span>
            `;
        } else {
            const sort_txt = sort_dir
                ?.map((x) => {
                    const icon = ICON_MAP[x];
                    return html` <span class="pd-column-header-icon">${icon}</span> `;
                })
                .join("");
            th.innerHTML = html`
                <span>${column}</span>
                ${sort_txt}
                <span class="pd-column-resize"></span>
            `;
        }

        return th;
    }

    _redraw_previous(offset_cache, d) {
        const cidx = offset_cache[d] - 1;
        if (cidx < 0) {
            return;
        }
        const th = this._get_cell("TH", d, cidx);
        if (!th) return;
        return th;
    }

    _draw_group(column, column_name, th) {
        const metadata = this._get_or_create_metadata(th);
        metadata.column_path = column;
        metadata.column_name = column_name;
        metadata.is_column_header = false;
        return metadata;
    }

    _draw_th(column, column_name, th, cidx, size_key) {
        const metadata = this._get_or_create_metadata(th);
        metadata.column_path = column;
        metadata.column_name = column_name;
        metadata.is_column_header = true;
        metadata.size_key = size_key.length ? size_key[0] : size_key; // FIXME

        let auto_width, override_width;
        if (size_key.length > 1) {
            auto_width = size_key.reduce((total, row_header) => this._column_sizes.auto[row_header] + total, 0);
            override_width = size_key.reduce((total, row_header) => this._column_sizes.override[row_header] + total, 0);
        } else {
            auto_width = this._column_sizes.auto[metadata.size_key];
            override_width = this._column_sizes.override[metadata.size_key];
        }
        if (override_width) {
            th.classList.toggle("pd-cell-clip", auto_width > override_width);
            th.style.minWidth = override_width + "px";
            th.style.maxWidth = override_width + "px";
        } else if (auto_width) {
            th.classList.remove("pd-cell-clip");
            th.style.maxWidth = "";
            th.style.minWidth = auto_width + "px";
        }
        return metadata;
    }

    get_column_header(cidx) {
        return this._get_cell("TH", this.rows.length - 1, cidx);
    }

    _group_header_cache = [];
    _offset_cache = [];

    draw(config, alias, parts, colspan, cidx, dcidx, size_key) {
        const header_levels = parts?.length; //config.column_pivots.length + 1;
        if (header_levels === 0) return {};
        let th,
            metadata,
            column_name,
            is_new_group = false;
        for (let d = 0; d < header_levels; d++) {
            column_name = parts[d] ? parts[d] : "";
            this._offset_cache[d] = this._offset_cache[d] || 0;
            if (d < header_levels - 1) {
                if (this._group_header_cache?.[d]?.[0]?.column_name === column_name) {
                    th = this._group_header_cache[d][1];
                    this._group_header_cache[d][2] += 1;
                    th.setAttribute("colspan", this._group_header_cache[d][2]);
                } else {
                    th = this._draw_group_th(this._offset_cache, d, column_name, []);
                    metadata = this._draw_group(parts, column_name, th);
                    this._group_header_cache[d] = [metadata, th, 1];
                    is_new_group = true;
                }
            } else {
                if (is_new_group) {
                    this._redraw_previous(this._offset_cache, d);
                }
                const sort_dir = config.sort?.filter((x) => x[0] === column_name).map((x) => x[1]);
                th = this._draw_group_th(this._offset_cache, d, column_name, sort_dir);

                // Update the group header's metadata such that each group
                // header has the same metadata coordinates of its rightmost
                // column.
                metadata = this._draw_th(alias || parts, column_name, th, cidx, size_key);
                metadata.cidx = cidx;
                for (const [group_meta] of this._group_header_cache) {
                    group_meta.cidx = cidx;
                    group_meta.size_key = metadata.size_key;
                }
                th.removeAttribute("colspan");
                th.dataset.sizeKey = metadata.size_key;
            }
            if (metadata) {
                metadata.x = dcidx;
                metadata.column_header_y = d;
            }
            if (colspan > 1) {
                th.setAttribute("colspan", colspan);
            }
        }

        this._clean_rows(this._offset_cache.length);
        return {th, metadata};
    }

    clean() {
        this._clean_columns(this._offset_cache);
        this._offset_cache = [];
        this._group_header_cache = [];
    }
}
