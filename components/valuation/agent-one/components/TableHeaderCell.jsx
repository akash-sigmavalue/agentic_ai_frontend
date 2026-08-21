import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowDown, Filter, ChevronDown, Search, X } from "lucide-react";
import { getRowValue, parseNumericValue } from "../chat-utils";

function SpreadsheetFilterDropdown({
  triggerRef,
  columnKey,
  label,
  uniqueValues,
  sortConfig,
  onSort,
  filterConfig,
  onFilterChange,
  onClose,
}) {
  const dropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const selectedValues = useMemo(() => filterConfig?.[columnKey] || [], [filterConfig, columnKey]);

  useEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const dropdownHeight = 320;

      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 4;

      if (rect.left + dropdownWidth > window.innerWidth) {
        left = rect.right - dropdownWidth + window.scrollX;
      }
      if (left < 0) {
        left = 8 + window.scrollX;
      }
      if (rect.bottom + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4 + window.scrollY;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  const filteredOptions = useMemo(() => {
    return uniqueValues.filter(val => {
      const displayVal = val === "" ? "(Blanks)" : val;
      return displayVal.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [uniqueValues, searchQuery]);

  const isAllChecked = !filterConfig?.[columnKey] || filterConfig[columnKey].length === uniqueValues.length;

  const handleToggleOption = (val) => {
    let nextSelected;
    const currentFilter = filterConfig?.[columnKey];
    if (!currentFilter) {
      nextSelected = uniqueValues.filter(v => v !== val);
    } else {
      if (currentFilter.includes(val)) {
        nextSelected = currentFilter.filter(v => v !== val);
      } else {
        nextSelected = [...currentFilter, val];
      }
    }

    if (nextSelected.length === uniqueValues.length) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, nextSelected);
    }
  };

  const isOptionChecked = (val) => {
    const currentFilter = filterConfig?.[columnKey];
    if (!currentFilter) return true;
    return currentFilter.includes(val);
  };

  const handleSortAsc = () => {
    onSort(columnKey, "asc");
    onClose();
  };

  const handleSortDesc = () => {
    onSort(columnKey, "desc");
    onClose();
  };

  const handleClearSort = () => {
    onSort(columnKey, null);
    onClose();
  };

  const handleClearFilter = () => {
    onFilterChange(columnKey, null);
    onClose();
  };

  const handleSelectOnly = (val) => {
    onFilterChange(columnKey, [val]);
  };

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
      }}
      className="z-[99999] w-60 rounded-xl border border-border bg-bg-card/95 backdrop-blur-md shadow-2xl p-3 text-xs flex flex-col max-h-[320px] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="pb-2 border-b border-border/50 space-y-1 shrink-0">
        <button
          onClick={handleSortAsc}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition font-medium text-text-primary ${sortConfig?.column === columnKey && sortConfig?.direction === "asc" ? "bg-[#fb923c]/10 text-[#fb923c] hover:bg-[#fb923c]/15" : ""}`}
        >
          <ArrowUp size={13} className="text-text-dim shrink-0" />
          <span>Sort Smallest to Largest</span>
        </button>
        <button
          onClick={handleSortDesc}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition font-medium text-text-primary ${sortConfig?.column === columnKey && sortConfig?.direction === "desc" ? "bg-[#fb923c]/10 text-[#fb923c] hover:bg-[#fb923c]/15" : ""}`}
        >
          <ArrowDown size={13} className="text-text-dim shrink-0" />
          <span>Sort Largest to Smallest</span>
        </button>
        {sortConfig?.column === columnKey && sortConfig?.direction && (
          <button
            onClick={handleClearSort}
            className="w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 text-danger hover:bg-danger/10 transition"
          >
            <X size={13} className="shrink-0" />
            <span>Clear Sort</span>
          </button>
        )}
      </div>

      <div className="pt-2 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-1 mb-2 shrink-0">
          <span className="font-bold text-text-dim text-[10px] uppercase tracking-wider">Filter Values</span>
          {filterConfig?.[columnKey] && (
            <button
              onClick={handleClearFilter}
              className="text-[#fb923c] hover:text-[#fb923c]/80 hover:underline font-bold text-[10px] uppercase"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="relative mb-2 shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-deep/50 border border-border/60 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-[#fb923c] outline-none transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 text-[11px]">
          {searchQuery === "" && (
            <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-text-secondary select-none font-medium">
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFilterChange(columnKey, null);
                  } else {
                    onFilterChange(columnKey, []);
                  }
                }}
                className="h-3.5 w-3.5 rounded accent-[#fb923c] border-border"
              />
              <span>(Select All)</span>
            </label>
          )}

          {filteredOptions.length === 0 ? (
            <div className="text-center py-4 text-text-dim italic">No matching values</div>
          ) : (
            filteredOptions.map((val, idx) => {
              const displayVal = val === "" ? "(Blanks)" : val;
              const isChecked = isOptionChecked(val);
              return (
                <div key={idx} className="flex items-center justify-between group/opt rounded hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-text-secondary select-none flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(val)}
                      className="h-3.5 w-3.5 rounded accent-[#fb923c] border-border shrink-0"
                    />
                    <span className="truncate" title={displayVal}>{displayVal}</span>
                  </label>
                  <button
                    onClick={() => handleSelectOnly(val)}
                    className="opacity-0 group-hover/opt:opacity-100 text-[10px] text-[#fb923c] hover:text-[#fb923c]/80 font-bold uppercase transition"
                  >
                    Only
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TableHeaderCell({
  columnKey,
  label,
  sortConfig,
  onSort,
  filterConfig,
  onFilterChange,
  allRows,
  className = "",
  align = "left",
}) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const isSorted = sortConfig?.column === columnKey;
  const sortDir = isSorted ? sortConfig?.direction : null;

  const activeFilters = filterConfig?.[columnKey] || [];
  const hasActiveFilters = activeFilters.length > 0;

  const uniqueValues = useMemo(() => {
    if (!allRows) return [];
    const values = allRows.map(row => {
      const val = getRowValue(row, columnKey);
      return val === null || val === undefined || val === "" ? "" : String(val);
    });
    return Array.from(new Set(values)).sort((a, b) => {
      if (a === "") return 1;
      if (b === "") return -1;
      const numA = parseNumericValue(a);
      const numB = parseNumericValue(b);
      if (numA !== -Infinity && numB !== -Infinity) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [allRows, columnKey]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClose = () => setIsOpen(false);

  return (
    <th className={`px-3 py-2.5 font-semibold group/header relative select-none ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}>
      <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>

        <div className="flex items-center gap-0.5">
          {isSorted && (
            sortDir === "asc" ? (
              <ArrowUp size={12} className="text-[#fb923c] animate-fade-in" />
            ) : (
              <ArrowDown size={12} className="text-[#fb923c] animate-fade-in" />
            )
          )}
          {hasActiveFilters && (
            <Filter size={10} className="text-[#fb923c] animate-fade-in" />
          )}

          <button
            ref={triggerRef}
            onClick={toggleDropdown}
            className={`opacity-0 group-hover/header:opacity-100 focus:opacity-100 hover:text-accent-light text-text-dim transition p-0.5 rounded ${isOpen ? 'opacity-100 text-accent bg-black/5 dark:bg-white/5' : ''}`}
            title="Sort & Filter"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {isOpen && (
        <SpreadsheetFilterDropdown
          triggerRef={triggerRef}
          columnKey={columnKey}
          label={label}
          uniqueValues={uniqueValues}
          sortConfig={sortConfig}
          onSort={onSort}
          filterConfig={filterConfig}
          onFilterChange={onFilterChange}
          onClose={handleClose}
        />
      )}
    </th>
  );
}
