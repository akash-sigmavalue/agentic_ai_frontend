import streamlit as st
import pandas as pd
from datetime import date
from dateutil.relativedelta import relativedelta

st.set_page_config(page_title="Construction Schedule Builder", layout="wide")

# ---- Domain data --------------------------------------------------------------
STAGES = {
    "Mobilization & Excavation": 10,
    "Foundation & Plinth Work": 10,
    "Ground Floor Structure": 10,
    "Superstructure (Up to 3rd Floor)": 10,
    "Superstructure Completion": 10,
    "Brickwork & Internal Plastering": 10,
    "External Plastering & Waterproofing": 10,
    "Flooring & Tiling Work": 10,
    "Electrical, Plumbing & Fixtures": 10,
    "Painting & Final Finishes": 5,
    "Site Development & Landscaping": 3,
    "Possession & Handover": 2,
}

DESCRIPTIONS = {
    "Mobilization & Excavation": "Site clearing, excavation, temporary site office setup",
    "Foundation & Plinth Work": "Footing concreting, foundation walls, plinth beam",
    "Ground Floor Structure": "RCC columns, slab, and brickwork up to 1st floor",
    "Superstructure (Up to 3rd Floor)": "Columns, slabs, and beams up to 3rd floor",
    "Superstructure Completion": "Remaining RCC structure and parapet",
    "Brickwork & Internal Plastering": "Internal partition walls, internal plaster",
    "External Plastering & Waterproofing": "External walls, terrace work",
    "Flooring & Tiling Work": "Internal flooring, skirting, bathroom tiling",
    "Electrical, Plumbing & Fixtures": "MEP installations, switches, sanitary fittings",
    "Painting & Final Finishes": "Internal & external painting, final finishes",
    "Site Development & Landscaping": "Road, compound wall, amenities",
    "Possession & Handover": "Final inspection, OC, handover",
}

# ---- Helpers -----------------------------------------------------------------
def get_quarter_from_date(d: date):
    """Get quarter number (1-4) from a date"""
    month = d.month
    if month in [1, 2, 3]:
        return 1
    elif month in [4, 5, 6]:
        return 2
    elif month in [7, 8, 9]:
        return 3
    else:  # month in [10, 11, 12]
        return 4

def year_quarter_from_offset(start: date, q_offset: int):
    """Compute actual Year, Quarter, and date based on quarter offset from start date"""
    q_date = start + relativedelta(months=3 * q_offset)
    
    # Calculate start quarter and year
    start_quarter = get_quarter_from_date(start)
    start_year = start.year
    
    # Calculate total quarters from start
    total_quarters = start_quarter - 1 + q_offset
    
    # Calculate actual year and quarter
    actual_year = start_year + (total_quarters // 4)
    actual_quarter = (total_quarters % 4) + 1
    
    return str(actual_year), f"Q{actual_quarter}", q_date

def ensure_unique_selection(across_rows, current_row_idx):
    """Allow only unused stages in dropdowns"""
    selected_elsewhere = set()
    for idx, row in enumerate(across_rows):
        if idx == current_row_idx:
            continue
        selected_elsewhere.update(row.get("stages", []))
    return [s for s in STAGES.keys() if s not in selected_elsewhere]

def build_dataframe(rows, start_date):
    """Build dataframe and compute cumulative %"""
    data = []
    cumulative = 0
    for i, row in enumerate(rows):
        year_label, quarter_label, _ = year_quarter_from_offset(start_date, i)
        stages = row.get("stages", [])
        row_pct = sum(STAGES[s] for s in stages)
        cumulative += row_pct
        descriptions = ", ".join(DESCRIPTIONS[s] for s in stages) if stages else ""
        data.append(
            {
                "Year": year_label,
                "Quarter": quarter_label,
                "Stage / Activity completion": ", ".join(stages),
                "Description": descriptions,
                "% of Work Completed (Quarter)": row_pct,
                "% of Work Completed (Cumulative)": cumulative,
            }
        )
    df = pd.DataFrame(data)
    return df, cumulative

# ---- Session State -----------------------------------------------------------
if "rows" not in st.session_state:
    st.session_state.rows = [{"stages": []}]

if "start_date" not in st.session_state:
    st.session_state.start_date = date.today()

# ---- Sidebar controls --------------------------------------------------------
st.sidebar.title("Schedule Inputs")
start_date = st.sidebar.date_input(
    "Project Start Date",
    value=st.session_state.start_date,
)
st.session_state.start_date = start_date

# Display calculated start year and quarter
start_quarter = get_quarter_from_date(start_date)
start_year = start_date.year
st.sidebar.info(f"**Start Year:** {start_year}  \n**Start Quarter:** Q{start_quarter}")

col_btn1, col_btn2 = st.sidebar.columns(2)
if col_btn1.button("+ Add Quarter", use_container_width=True):
    st.session_state.rows.append({"stages": []})
if col_btn2.button("Reset", type="secondary", use_container_width=True):
    st.session_state.rows = [{"stages": []}]
    st.rerun()

st.sidebar.caption("Each stage can be used only once. Multiple stages per quarter allowed.")

# ---- Main table --------------------------------------------------------------
st.title("Construction Schedule (Quarter-wise)")

# Table headers
header_cols = st.columns([0.7, 0.7, 2.4, 1.2, 1.2, 0.5])
headers = ["Year", "Quarter", "Stages (multi-select)", "Quarter %", "Cumulative %", ""]
for col, label in zip(header_cols, headers):
    col.markdown(f"**{label}**")

rows_to_delete = []
quarter_percentages = []
cumulative_percentages = []

# Display the table and calculate percentages based on current selections
for i, row in enumerate(st.session_state.rows):
    year_label, quarter_label, _ = year_quarter_from_offset(start_date, i)
    allowed_options = ensure_unique_selection(st.session_state.rows, i)
    current_selection = [s for s in row.get("stages", []) if s in allowed_options]

    c1, c2, c3, c4, c5, c6 = st.columns([0.7, 0.7, 2.4, 1.2, 1.2, 0.5])
    with c1:
        st.text_input("Year", value=year_label, key=f"year_{i}", disabled=True, label_visibility="collapsed")
    with c2:
        st.text_input("Quarter", value=quarter_label, key=f"quarter_{i}", disabled=True, label_visibility="collapsed")
    with c3:
        sel = st.multiselect(
            "Stages",
            options=allowed_options,
            default=current_selection,
            key=f"stages_{i}",
            label_visibility="collapsed",
        )
        st.session_state.rows[i]["stages"] = sel
    
    # Calculate quarter percentage for this row based on selected stages
    row_pct = sum(STAGES[s] for s in sel)
    quarter_percentages.append(row_pct)
    
    # Calculate cumulative percentage
    prev_cum = cumulative_percentages[i-1] if i > 0 else 0
    cum_pct = prev_cum + row_pct
    cumulative_percentages.append(cum_pct)
    
    with c4:
        # Display quarter percentage with calculation breakdown
        stage_breakdown = " + ".join([f"{STAGES[s]}%" for s in sel]) if sel else "0%"
        st.markdown(f"**{row_pct}%**")
        if sel:
            st.caption(f"({stage_breakdown})")
        else:
            st.caption("(no stages selected)")
    with c5:
        # Display cumulative percentage with calculation breakdown
        st.markdown(f"**{cum_pct}%**")
        if i > 0:
            st.caption(f"(prev: {prev_cum}% + {row_pct}%)")
        else:
            st.caption(f"(starting: {row_pct}%)")
    with c6:
        if st.button("➖", key=f"remove_{i}", help="Remove this quarter"):
            rows_to_delete.append(i)

# Handle deletions safely
if rows_to_delete:
    for idx in sorted(rows_to_delete, reverse=True):
        del st.session_state.rows[idx]
    st.rerun()

# Calculate totals for display in main section (use calculated percentages)
quarter_total = sum(quarter_percentages) if quarter_percentages else 0
final_cumulative = cumulative_percentages[-1] if cumulative_percentages else 0

# Display percentage calculations in main section
st.markdown("### Percentage Summary")
col1, col2 = st.columns(2)
with col1:
    st.metric("Total Quarter %", f"{quarter_total}", help="Sum of all quarter percentages (should be 100)")
with col2:
    st.metric("Final Cumulative %", f"{final_cumulative}", help="Final cumulative percentage (should be 100)")

# Display validation status
if final_cumulative < 100:
    st.warning(f"⚠️ Cumulative % is {final_cumulative} (less than 100). Add remaining stages to reach 100.")
elif final_cumulative > 100:
    st.error(f"❌ Cumulative % is {final_cumulative} (exceeds 100). Remove some stages or adjust selections.")
else:
    st.success(f"✅ Cumulative % is exactly {final_cumulative}. Schedule is complete.")

st.markdown("---")



# ---- Output Table ----
df, total_cum = build_dataframe(st.session_state.rows, start_date)
st.subheader("Schedule Table")
st.dataframe(df, use_container_width=True)

# ---- Totals ----
quarter_total = df["% of Work Completed (Quarter)"].sum() if not df.empty else 0
st.write(f"**Total of Quarter % (should be 100):** {quarter_total}")
st.write(f"**Final Cumulative % (should be 100):** {total_cum}")

if total_cum < 100:
    st.warning("Cumulative % is less than 100. Add remaining stages to reach 100.")
elif total_cum > 100:
    st.error("Cumulative % exceeds 100. Remove some stages or adjust selections.")
else:
    st.success("Cumulative % is exactly 100. Schedule is complete.")

# ---- CSV Download ----
csv = df.to_csv(index=False).encode("utf-8")
st.download_button("Download CSV", data=csv, file_name="construction_schedule.csv", mime="text/csv")
