/******************************************************************************
 *
 * Copyright (c) 2020, the Regular Table Authors.
 *
 * This file is part of the Regular Table library, distributed under the terms
 * of the Apache License 2.0.  The full license can be found in the LICENSE
 * file.
 *
 */

import {METADATA_MAP} from "./constants";
import {RegularVirtualTableViewModel} from "./scroll_panel";
import {throttlePromise} from "./utils";

/**
 *
 *
 * @class RegularViewEventModel
 * @extends {RegularVirtualTableViewModel}
 */
export class RegularViewEventModel extends RegularVirtualTableViewModel {
    register_listeners() {
        this.addEventListener("scroll", this._on_scroll.bind(this), {
            passive: false,
        });
        this.addEventListener("mousewheel", this._on_mousewheel.bind(this), {
            passive: false,
        });
        this.addEventListener("mousedown", this._on_click.bind(this));
        this.addEventListener("dblclick", this._on_dblclick.bind(this));
    }

    /**
     * @returns
     * @memberof RegularViewModel
     */
    async _on_scroll(event) {
        event.stopPropagation();
        event.returnValue = false;
        await this.draw();
        this.dispatchEvent(new CustomEvent("regular-table-scroll"));
    }

    /**
     * Mousewheel must precalculate in addition to `_on_scroll` to prevent
     * visual artifacts due to scrolling "inertia" on modern browsers/mobile.
     *
     * @param {*} event
     * @memberof RegularViewModel
     */
    _on_mousewheel(event) {
        if (this._virtual_scrolling_disabled) {
            return;
        }
        event.preventDefault();
        event.returnValue = false;
        const {offsetWidth, offsetHeight, scrollTop, scrollLeft} = this;
        const total_scroll_height = Math.max(1, this._virtual_panel.offsetHeight - offsetHeight);
        const total_scroll_width = Math.max(1, this._virtual_panel.offsetWidth - offsetWidth);
        this.scrollTop = Math.min(total_scroll_height, scrollTop + event.deltaY);
        this.scrollLeft = Math.min(total_scroll_width, scrollLeft + event.deltaX);
        this._on_scroll(event);
    }

    /**
     * Handles double-click header width override reset.
     *
     * @param {*} event
     * @returns
     * @memberof RegularVirtualTableViewModel
     */
    async _on_dblclick(event) {
        let element = event.target;
        while (element.tagName !== "TD" && element.tagName !== "TH") {
            element = element.parentElement;
            if (!this._sticky_container.contains(element)) {
                return;
            }
        }
        const is_resize = event.target.classList.contains("pd-column-resize");
        const metadata = METADATA_MAP.get(element);
        if (is_resize) {
            await new Promise(setTimeout);
            delete this._column_sizes.override[metadata.size_key];
            delete this._column_sizes.auto[metadata.size_key];
            delete this._column_sizes.indices[metadata.cidx];
            element.style.minWidth = "";
            element.style.maxWidth = "";
            for (const row of this.table_model.body.cells) {
                const td = row[metadata.cidx];
                td.style.minWidth = "";
                td.style.maxWidth = "";
                td.classList.remove("pd-cell-clip");
            }
            await this.draw({invalid_viewport: true});
        }
    }

    /**
     * Dispatches all click events to other handlers, depending on
     * `event.target`.
     *
     * @param {*} event
     * @returns
     * @memberof RegularVirtualTableViewModel
     */
    async _on_click(event) {
        if (event.button !== 0) {
            return;
        }

        let element = event.target;
        while (element.tagName !== "TD" && element.tagName !== "TH") {
            element = element.parentElement;
            if (!this._sticky_container.contains(element)) {
                return;
            }
        }

        const is_resize = event.target.classList.contains("pd-column-resize");
        const metadata = METADATA_MAP.get(element);
        if (is_resize) {
            this._on_resize_column(event, element, metadata);
        } else {
            // skip callbacks if this is a resize event
            for (const callback of this._click_callbacks.values()) {
                await callback(event, element, metadata);
            }
        }
    }

    /**
     * Regular event for column resize.
     *
     * @param {*} event
     * @param {*} element
     * @param {*} metadata
     * @memberof RegularVirtualTableViewModel
     */
    _on_resize_column(event, element, metadata) {
        const start = event.pageX;
        element = this.table_model.header.get_column_header(metadata.vcidx);
        const width = this._column_sizes.indices[metadata.cidx];
        const move = (event) => this._on_resize_column_move(event, element, start, width, metadata);
        const up = async () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
            const override_width = this._column_sizes.override[metadata.size_key];
            this._column_sizes.indices[metadata.cidx] = override_width;
            await this.draw({invalid_viewport: true});
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }

    /**
     * Regular event for mouse movement when resizing a column.
     *
     * @param {*} event
     * @param {*} th
     * @param {*} start
     * @param {*} width
     * @param {*} metadata
     * @memberof RegularVirtualTableViewModel
     */
    @throttlePromise
    async _on_resize_column_move(event, th, start, width, metadata) {
        await new Promise(setTimeout);
        const diff = event.pageX - start;
        const override_width = width + diff;
        this._column_sizes.override[metadata.size_key] = override_width;

        // If the column is smaller, new columns may need to be fetched, so
        // redraw, else just update the DOM widths as if redrawn.
        if (diff < 0) {
            await this.draw({invalid_viewport: true, preserve_width: true});
        } else {
            th.style.minWidth = override_width + "px";
            th.style.maxWidth = override_width + "px";
            const auto_width = this._column_sizes.auto[metadata.size_key];
            for (const row of this.table_model.body.cells) {
                const td = row[metadata.vcidx];
                td.style.maxWidth = td.style.minWidth = override_width + "px";
                td.classList.toggle("pd-cell-clip", auto_width > override_width);
            }
        }
    }
}
