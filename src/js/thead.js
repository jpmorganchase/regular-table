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
import {html} from "./utils.js";

/**
 * <thead> view model.  This model accumulates state in the form of
 * column_sizes, which leverages <tables> autosize behavior across
 * virtual pages.
 *
 * @class RegularHeaderViewModel
 */
export class RegularHeaderViewModel extends ViewModel {
    _draw_group_th(offset_cache, d, column) {
        const th = this._get_cell("TH", d, offset_cache[d]);
        offset_cache[d] += 1;
        th.className = "";
        th.removeAttribute("colspan");
        th.style.minWidth = "0";
        th.textContent = column;
        return th;
    }

    _draw_group(column, column_name, th) {
        const metadata = this._get_or_create_metadata(th);
        metadata.column_header = column;
        metadata.value = column_name;
        metadata.value = column_name;
        th.className = "";
        return metadata;
    }

    _draw_th(column, column_name, th, cidx, size_key) {
        const metadata = this._get_or_create_metadata(th);
        metadata.column_header = column;
        metadata.value = column_name;
        metadata.size_key = size_key.length ? size_key[0] : size_key; // FIXME

        if (!(size_key.length > 1)) {
            const override_width = this._column_sizes.override[metadata.size_key];
            const auto_width = this._column_sizes.auto[metadata.size_key];
            if (override_width) {
                th.classList.toggle("pd-cell-clip", auto_width > override_width);
                th.style.minWidth = override_width + "px";
                th.style.maxWidth = override_width + "px";
            } else if (auto_width) {
                th.classList.remove("pd-cell-clip");
                th.style.maxWidth = "";
                th.style.minWidth = auto_width + "px";
            } else {
                th.style.maxWidth = "";
                th.style.maxWidth = "";
            }
        }

        return metadata;
    }

    get_column_header(cidx) {
        return this._get_cell("TH", this.rows.length - 1, cidx);
    }

    _group_header_cache = [];
    _offset_cache = [];

    draw(alias, parts, colspan, x, size_key, x0, _virtual_x) {
        const header_levels = parts?.length; //config.column_pivots.length + 1;
        if (header_levels === 0) return {};
        let th, metadata, column_name;
        for (let d = 0; d < header_levels; d++) {
            column_name = parts[d] ? parts[d] : "";
            this._offset_cache[d] = this._offset_cache[d] || 0;
            if (d < header_levels - 1) {
                if (this._group_header_cache?.[d]?.[0]?.value === column_name) {
                    th = this._group_header_cache[d][1];
                    this._group_header_cache[d][2] += 1;
                    if (colspan === 1) {
                        this._group_header_cache[d][0].row_header_x = size_key;
                    }
                    th.setAttribute("colspan", this._group_header_cache[d][2]);
                } else {
                    th = this._draw_group_th(this._offset_cache, d, column_name);
                    metadata = this._draw_group(parts, column_name, th);
                    this._group_header_cache[d] = [metadata, th, 1];
                }
            } else {
                th = this._draw_group_th(this._offset_cache, d, column_name);

                // Update the group header's metadata such that each group
                // header has the same metadata coordinates of its rightmost
                // column.
                metadata = this._draw_th(alias || parts, column_name, th, x, size_key);
                for (const [group_meta] of this._group_header_cache) {
                    group_meta.size_key = metadata.size_key;
                }
                th.removeAttribute("colspan");
            }
            if (metadata) {
                metadata.x = x;
                metadata.column_header_y = d;
                metadata.x0 = x0;
                metadata._virtual_x = _virtual_x;
                if (colspan === 1) {
                    metadata.row_header_x = size_key;
                }
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
