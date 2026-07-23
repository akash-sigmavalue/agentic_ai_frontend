import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FaCircleInfo,
  FaCloudArrowUp,
  FaFilePdf,
  FaCheck,
  FaSpinner,
  FaCircleExclamation,
  FaChevronDown,
  FaChevronUp,
  FaTrashCan,
  FaPlay,
  FaMapLocationDot,
  FaLeaf,
  FaBuilding,
  FaLandmarkDome,
  FaPlane,
  FaScaleBalanced,
  FaRoad,
  FaTableCells,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiUrl } from "@/lib/api-client";

/* ─────────────────────── constants ─────────────────────── */

const SECTION_SESSION_ID = "regulatory-intelligence";

const REGULATORY_SECTIONS = [
  {
    id: "reservations",
    title: "Reservations (Master Plan / Survey Map)",
    question:
      "What reservations, if any, are applicable to the property as per the Master Plan / Development Plan / Survey Map in Mumbai location?",
    icon: FaMapLocationDot,
    color: "#448C74",
    gradient: "linear-gradient(135deg, #448C74 0%, #2d6b55 100%)",
  },
  {
    id: "environmental-compliance",
    title: "Environmental Compliance",
    question:
      "What environmental compliance requirements or approvals are applicable to the property in Baner?",
    icon: FaLeaf,
    color: "#2e7d32",
    gradient: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
  },
  {
    id: "height-restrictions",
    title: "Height Restrictions",
    question:
      "Are there any height restrictions applicable to the proposed development? If yes, what is the maximum permissible height?",
    icon: FaBuilding,
    color: "#1565c0",
    gradient: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
  },
  {
    id: "heritage-restrictions",
    title: "Heritage Restrictions",
    question:
      "Is the property located within a heritage zone or subject to any heritage restrictions?",
    icon: FaLandmarkDome,
    color: "#6a1b9a",
    gradient: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)",
  },
  {
    id: "airport-clearances",
    title: "Airport Clearances",
    question:
      "Does the proposed development require Airport Authority (AAI) or aviation clearance?",
    icon: FaPlane,
    color: "#e65100",
    gradient: "linear-gradient(135deg, #e65100 0%, #bf360c 100%)",
  },
  {
    id: "development-regulations",
    title: "Development Regulations",
    question:
      "Which Development Control Regulations (DCR/UDCPR/Local Planning Regulations) govern the proposed development?",
    icon: FaScaleBalanced,
    color: "#ad1457",
    gradient: "linear-gradient(135deg, #ad1457 0%, #880e4f 100%)",
  },
  {
    id: "buffer-distance",
    title: "Buffer Distance from Roads",
    question:
      "What is the minimum required buffer distance or setback from the abutting road in Pune?",
    icon: FaRoad,
    color: "#00838f",
    gradient: "linear-gradient(135deg, #00838f 0%, #006064 100%)",
  },
  {
    id: "fsi-sanctioned-details",
    title: "FSI Sanctioned Details",
    question:
      "For given land parcel coordinates 18.56176049, 73.77948239, development category is Residential, Road Width is 9-12, planning authority is Pune Municipal Corporation, Provide the maximum permissible FSI also provide table for it",
    icon: FaTableCells,
    color: "#37474f",
    gradient: "linear-gradient(135deg, #37474f 0%, #263238 100%)",
  },
];

/* ─────────────────────── styles ─────────────────────── */

const styles = {
  dropZone: (isDragOver) => ({
    border: `2px dashed ${isDragOver ? "#448C74" : "#c5ccd6"}`,
    borderRadius: "12px",
    padding: "40px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    background: isDragOver
      ? "rgba(68,140,116,0.06)"
      : "linear-gradient(135deg, #fafbfc 0%, #f0f4f8 100%)",
    position: "relative",
  }),
  uploadIcon: {
    fontSize: "48px",
    color: "#448C74",
    marginBottom: "12px",
    opacity: 0.7,
  },
  fileChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "8px",
    background: "rgba(68,140,116,0.08)",
    border: "1px solid rgba(68,140,116,0.2)",
    fontSize: "14px",
    color: "#333",
  },
  sectionCard: (color, isExpanded) => ({
    borderRadius: "10px",
    border: "1px solid #e8ecf0",
    borderLeft: `4px solid ${color}`,
    overflow: "hidden",
    transition: "all 0.3s ease",
    boxShadow: isExpanded
      ? "0 4px 16px rgba(0,0,0,0.08)"
      : "0 1px 4px rgba(0,0,0,0.04)",
    marginBottom: "12px",
  }),
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    cursor: "pointer",
    background: "#fff",
    border: "none",
    width: "100%",
    textAlign: "left",
    transition: "background 0.2s ease",
  },
  sectionIconBadge: (gradient) => ({
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "16px",
    flexShrink: 0,
  }),
  progressBar: (pct) => ({
    height: "6px",
    borderRadius: "3px",
    background: "#e9ecef",
    overflow: "hidden",
    position: "relative",
  }),
  progressFill: (pct) => ({
    width: `${pct}%`,
    height: "100%",
    borderRadius: "3px",
    background: "linear-gradient(90deg, #448C74, #55d19d)",
    transition: "width 0.5s ease",
  }),
  statusBadge: (variant) => {
    const map = {
      pending: { bg: "#f0f0f0", color: "#888", label: "Pending" },
      loading: { bg: "#fff3e0", color: "#e65100", label: "Processing..." },
      completed: { bg: "#e8f5e9", color: "#2e7d32", label: "Completed" },
      error: { bg: "#fce4ec", color: "#c62828", label: "Error" },
    };
    const s = map[variant] || map.pending;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "3px 10px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    };
  },
  answerBox: {
    padding: "16px 20px 20px",
    background: "#fafbfc",
    borderTop: "1px solid #eef1f5",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#333",
  },
  questionText: {
    fontSize: "13px",
    color: "#666",
    background: "#f5f7fa",
    padding: "10px 14px",
    borderRadius: "6px",
    marginBottom: "14px",
    borderLeft: "3px solid #448C74",
  },
};

/* ─────────────────────── StatusIcon ─────────────────────── */

const StatusIcon = ({ status }) => {
  if (status === "completed")
    return <FaCheck style={{ fontSize: "10px" }} />;
  if (status === "loading")
    return (
      <FaSpinner
        style={{ fontSize: "10px", animation: "spin 1s linear infinite" }}
      />
    );
  if (status === "error")
    return <FaCircleExclamation style={{ fontSize: "10px" }} />;
  return null;
};

/* ─────────────────────── main component ─────────────────────── */

const RegulatoryIntelligence = () => {
  /* ── upload state ── */
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | indexed | error
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  /* ── editable questions state ── */
  const [editableQuestions, setEditableQuestions] = useState(
    () =>
      Object.fromEntries(
        REGULATORY_SECTIONS.map((s) => [s.id, s.question])
      )
  );

  const updateQuestion = (sectionId, value) => {
    setEditableQuestions((prev) => ({ ...prev, [sectionId]: value }));
  };

  const userEditedRef = useRef({});

  // Load location data from localStorage and construct dynamic questions
  useEffect(() => {
    const handleSync = () => {
      const savedLandData = localStorage.getItem('Land Identification');
      let location = 'Mumbai';
      let country = 'India';
      let village = 'Baner';
      let planningAuthority = 'Pune Municipal Corporation';
      let lat = '18.56176049';
      let lng = '73.77948239';

      console.log("handleSync triggered. Raw savedLandData:", savedLandData);
      let developmentCategory = '';
      let roadCategory = '';
      let roadWidening = '';
      if (savedLandData) {
        try {
          const parsed = JSON.parse(savedLandData);
          console.log("Parsed Land Identification JSON:", parsed);
          location = parsed.location || parsed.city || location;
          country = parsed.country || country;
          village = parsed.village || village;
          planningAuthority = parsed.planningAuthority || parsed.planning_authority || planningAuthority;
          lat = parsed.polygonCenterLat || lat;
          lng = parsed.polygonCenterLng || lng;
          developmentCategory = parsed.developmentCategory || '';
          roadCategory = parsed.roadCategory || '';
          roadWidening = parsed.roadWidening || '';
          console.log("Values resolved: location =", location, "country =", country, "village =", village, "planningAuthority =", planningAuthority, "lat =", lat, "lng =", lng, "developmentCategory =", developmentCategory, "roadCategory =", roadCategory, "roadWidening =", roadWidening);
        } catch (e) {
          console.error("Error parsing Land Identification data:", e);
        }
      }

      const formattedDevCat = developmentCategory
        ? (developmentCategory === 'mixed' ? 'Mixed Use' : developmentCategory.charAt(0).toUpperCase() + developmentCategory.slice(1))
        : '';

      const formatRoadWidth = (val) => {
        const map = {
          below9: "Below 9 m.",
          "9-12": "9 m. and above but below 12 m.",
          "12-15": "12 m. and above but below 15 m.",
          "15-24": "15 m. and above but below 24 m.",
          "24-30": "24 and above but below 30 m.",
          "30+": "30 and above"
        };
        return map[val] || val || '';
      };
      const formattedRoadWidening = formatRoadWidth(roadWidening);

      const dynamicDefaults = {
        reservations: `What reservations, if any, are applicable to the property as per the Master Plan / Development Plan / Survey Map in ${village}, ${location}, ${country}?`,
        "environmental-compliance": `What environmental compliance requirements or approvals are applicable to the property in ${village ? village + ', ' : ''}${location}, ${country}?`,
        "height-restrictions": `Are there any height restrictions applicable to the proposed development in ${village}, ${location}, ${country}? If yes, what is the maximum permissible height?`,
        "heritage-restrictions": `Is the property located within a heritage zone or subject to any heritage restrictions in ${village}, ${location}, ${country}?`,
        "airport-clearances": `Does the proposed development in ${village}, ${location}, ${country} require Airport Authority (AAI) or aviation clearance?`,
        "development-regulations": `Which Development Control Regulations (DCR/UDCPR/Local Planning Regulations) govern the proposed development in ${village}, ${location}, ${country}?`,
        "buffer-distance": `What is the minimum required buffer distance or setback from the abutting road in ${village}, ${location}, ${country}?`,
        "fsi-sanctioned-details": `For given land parcel coordinates ${lat}, ${lng}, development category is ${formattedDevCat || 'Residential'}, Road Width is ${formattedRoadWidening || '9-12'}, planning authority is ${planningAuthority} in ${location}, ${country}, Provide the maximum permissible FSI also provide table for it?`
      };

      setEditableQuestions((prev) => {
        const updated = { ...prev };
        REGULATORY_SECTIONS.forEach((s) => {
          // If the user has not manually customized the question, we always update it to the latest dynamic default
          if (!userEditedRef.current[s.id]) {
            updated[s.id] = dynamicDefaults[s.id];
          }
        });
        return updated;
      });
    };

    window.addEventListener('landIdentificationSaved', handleSync);
    handleSync(); // Run initially on mount
    return () => window.removeEventListener('landIdentificationSaved', handleSync);
  }, []);

  /* ── Q&A state ── */
  const [sectionResults, setSectionResults] = useState(
    () =>
      Object.fromEntries(
        REGULATORY_SECTIONS.map((s) => [
          s.id,
          { status: "pending", answer: "", error: "" },
        ])
      )
  );

  // Load saved Regulatory Intelligence payload on mount
  useEffect(() => {
    const saved = localStorage.getItem("Regulatory Intelligence");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.editableQuestions) {
          setEditableQuestions((prev) => ({ ...prev, ...parsed.editableQuestions }));
        }
        if (parsed.sectionResults) {
          setSectionResults((prev) => ({ ...prev, ...parsed.sectionResults }));
        }
      } catch (e) {
        console.error("Error parsing Regulatory Intelligence payload:", e);
      }
    }
  }, []);

  // Persist Regulatory Intelligence payload to localStorage
  const saveRegulatoryPayload = (newResults, newQuestions) => {
    const currentResults = newResults || sectionResults;
    const currentQuestions = newQuestions || editableQuestions;
    const payload = {
      uploadedFiles: pdfFiles.map((f) => ({ name: f.name, size: f.size })),
      editableQuestions: currentQuestions,
      sectionResults: currentResults,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("Regulatory Intelligence", JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("regulatoryIntelligenceSaved", { detail: payload }));
    return payload;
  };

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState(
    () => new Set()
  );
  const abortRef = useRef(false);

  /* ── helpers ── */
  const completedCount = Object.values(sectionResults).filter(
    (r) => r.status === "completed" || r.status === "error"
  ).length;
  const progressPct =
    isRunning || completedCount > 0
      ? Math.round((completedCount / REGULATORY_SECTIONS.length) * 100)
      : 0;

  const toggleSection = (id) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusLabel = (status) => {
    if (status === "completed") return "Completed";
    if (status === "loading") return "Processing...";
    if (status === "error") return "Error";
    return "Pending";
  };

  /* ── file handling ── */
  const handleFiles = useCallback((incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const newPdfs = [];
    const invalidFiles = [];

    incomingFiles.forEach((file) => {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        newPdfs.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setUploadError(`Only PDF files are supported. Skipped: ${invalidFiles.join(", ")}`);
    } else {
      setUploadError("");
    }

    if (newPdfs.length > 0) {
      setPdfFiles((prev) => {
        // Prevent duplicates
        const filtered = newPdfs.filter(
          (newF) => !prev.some((oldF) => oldF.name === newF.name && oldF.size === newF.size)
        );
        return [...prev, ...filtered];
      });
      setUploadStatus("idle");
      setSectionResults(
        Object.fromEntries(
          REGULATORY_SECTIONS.map((s) => [
            s.id,
            { status: "pending", answer: "", error: "" },
          ])
        )
      );
      setCurrentQuestionIdx(-1);
      setIsRunning(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files || []);
      handleFiles(files);
    },
    [handleFiles]
  );

  const onFileSelect = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const removeFile = (idxToRemove) => {
    setPdfFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setUploadStatus("idle");
    setUploadError("");
    setSectionResults(
      Object.fromEntries(
        REGULATORY_SECTIONS.map((s) => [
          s.id,
          { status: "pending", answer: "", error: "" },
        ])
      )
    );
    setCurrentQuestionIdx(-1);
    setIsRunning(false);
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    setUploadStatus("idle");
    setUploadError("");
    setSectionResults(
      Object.fromEntries(
        REGULATORY_SECTIONS.map((s) => [
          s.id,
          { status: "pending", answer: "", error: "" },
        ])
      )
    );
    setCurrentQuestionIdx(-1);
    setIsRunning(false);
  };

  /* ── core: upload + sequential Q&A ── */
  const runAnalysis = async () => {
    if (pdfFiles.length === 0) return;
    abortRef.current = false;
    setIsRunning(true);
    setUploadError("");

    // Reset all sections
    setSectionResults(
      Object.fromEntries(
        REGULATORY_SECTIONS.map((s) => [
          s.id,
          { status: "pending", answer: "", error: "" },
        ])
      )
    );

    /* Step 1: Upload the PDFs */
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      pdfFiles.forEach((file) => {
        formData.append("files", file);
      });

      const uploadResp = await fetch(apiUrl("/user-input/documents"), {
        method: "POST",
        body: formData,
      });

      if (!uploadResp.ok) {
        throw new Error(
          `Upload failed (status ${uploadResp.status})`
        );
      }

      await uploadResp.json();
      setUploadStatus("indexed");
    } catch (err) {
      setUploadStatus("error");
      setUploadError(`Upload error: ${err.message}`);
      setIsRunning(false);
      return;
    }

    /* Step 2: Ask each question sequentially */
    for (let i = 0; i < REGULATORY_SECTIONS.length; i++) {
      if (abortRef.current) break;

      const section = REGULATORY_SECTIONS[i];
      setCurrentQuestionIdx(i);

      // Mark current section as loading
      setSectionResults((prev) => ({
        ...prev,
        [section.id]: { status: "loading", answer: "", error: "" },
      }));

      try {
        const askResp = await fetch(apiUrl("/user-input/ask"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: editableQuestions[section.id] || section.question,
            session_id: SECTION_SESSION_ID,
          }),
        });

        if (!askResp.ok) {
          throw new Error(`Request failed (status ${askResp.status})`);
        }

        const result = await askResp.json();
        const answer =
          result.answer ||
          result.response ||
          result.output ||
          result.content ||
          (typeof result === "string" ? result : JSON.stringify(result));

        setSectionResults((prev) => {
          const next = {
            ...prev,
            [section.id]: { status: "completed", answer, error: "" },
          };
          saveRegulatoryPayload(next);
          return next;
        });
      } catch (err) {
        setSectionResults((prev) => {
          const next = {
            ...prev,
            [section.id]: {
              status: "error",
              answer: "",
              error: err.message,
            },
          };
          saveRegulatoryPayload(next);
          return next;
        });
      }
    }

    setCurrentQuestionIdx(-1);
    setIsRunning(false);
  };

  /* ── run a single section ── */
  const runSingleSection = async (sectionId) => {
    const section = REGULATORY_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    setSectionResults((prev) => ({
      ...prev,
      [sectionId]: { status: "loading", answer: "", error: "" },
    }));

    try {
      const askResp = await fetch(apiUrl("/user-input/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editableQuestions[sectionId] || section.question,
          session_id: SECTION_SESSION_ID,
        }),
      });

      if (!askResp.ok) {
        throw new Error(`Request failed (status ${askResp.status})`);
      }

      const result = await askResp.json();
      const answer =
        result.answer ||
        result.response ||
        result.output ||
        result.content ||
        (typeof result === "string" ? result : JSON.stringify(result));

      setSectionResults((prev) => {
        const next = {
          ...prev,
          [sectionId]: { status: "completed", answer, error: "" },
        };
        saveRegulatoryPayload(next);
        return next;
      });
    } catch (err) {
      setSectionResults((prev) => {
        const next = {
          ...prev,
          [sectionId]: { status: "error", answer: "", error: err.message },
        };
        saveRegulatoryPayload(next);
        return next;
      });
    }
  };

  /* ── format file size ── */
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ─────────────────────── render ─────────────────────── */
  return (
    <div className="card shadow-sm border-0 rounded-3 mb-4">
      {/* Header */}
      <div
        className="card-header border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
        style={{
          background: "linear-gradient(135deg, #f8faf9 0%, #edf5f1 100%)",
        }}
      >
        <h5
          className="card-title mb-0 d-flex align-items-center"
          style={{ fontWeight: 700 }}
        >
          <FaCircleInfo className="me-2" style={{ color: "#448C74" }} />
          Regulatory Intelligence (Document Agent)
          <span
            className="ms-2"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#888",
              background: "#f0f0f0",
              padding: "2px 8px",
              borderRadius: "6px",
            }}
          >
            {REGULATORY_SECTIONS.length} Sections
          </span>
        </h5>
        <button
          type="button"
          className="btn btn-outline-success btn-sm rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
          style={{ fontSize: "12px", borderColor: "#448C74", color: "#2d6b55" }}
          onClick={() => window.open(`${window.location.origin}/user_input`, "_blank", "noopener,noreferrer")}
        >
          Open Document Agent <FaArrowUpRightFromSquare size={10} />
        </button>
      </div>

      <div className="card-body" style={{ padding: "24px" }}>
        {/* ── Upload Zone ── */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#444",
              marginBottom: "8px",
              display: "block",
            }}
          >
            Upload Regulatory Document (PDF)
          </label>

          <div
            style={styles.dropZone(isDragOver)}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FaCloudArrowUp style={styles.uploadIcon} />
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#444",
                marginBottom: "4px",
              }}
            >
              Drag & drop your PDFs here
            </div>
            <div style={{ fontSize: "13px", color: "#888" }}>
              or{" "}
              <span
                style={{
                  color: "#448C74",
                  fontWeight: 600,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                click to browse
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={onFileSelect}
              style={{ display: "none" }}
            />
          </div>

          {pdfFiles.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>
                Selected Files ({pdfFiles.length}):
              </div>
              {pdfFiles.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background:
                      uploadStatus === "indexed"
                        ? "rgba(46,125,50,0.03)"
                        : "rgba(68,140,116,0.03)",
                    border: `1px solid ${uploadStatus === "indexed" ? "rgba(46,125,50,0.15)" : "rgba(68,140,116,0.12)"}`,
                  }}
                >
                  <div style={styles.fileChip}>
                    <FaFilePdf style={{ color: "#c62828", fontSize: "16px" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>{file.name}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>
                        {formatSize(file.size)}
                        {uploadStatus === "indexed" && (
                          <span style={{ color: "#2e7d32", marginLeft: "8px" }}>
                            ✓ Indexed
                          </span>
                        )}
                        {uploadStatus === "uploading" && (
                          <span style={{ color: "#e65100", marginLeft: "8px" }}>
                            Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isRunning && (
                    <button
                      className="btn btn-sm"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#999",
                        padding: "4px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      title="Remove file"
                    >
                      <FaTrashCan style={{ fontSize: "13px" }} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  className="btn btn-sm"
                  style={{
                    background:
                      isRunning
                        ? "#ccc"
                        : "linear-gradient(135deg, #448C74, #55d19d)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 20px",
                    fontWeight: 600,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={runAnalysis}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <FaSpinner
                        style={{
                          animation: "spin 1s linear infinite",
                        }}
                      />{" "}
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FaPlay style={{ fontSize: "11px" }} /> Run Analysis
                    </>
                  )}
                </button>

                {!isRunning && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                    onClick={clearAllFiles}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}

          {uploadError && (
            <div
              className="mt-2"
              style={{
                color: "#c62828",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCircleExclamation /> {uploadError}
            </div>
          )}
        </div>

        {/* ── Progress Bar ── */}
        {(isRunning || completedCount > 0) && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>
                {isRunning
                  ? `Processing question ${currentQuestionIdx + 1} of ${REGULATORY_SECTIONS.length}...`
                  : `Analysis complete — ${completedCount} of ${REGULATORY_SECTIONS.length} sections`}
              </span>
              <span
                style={{ fontSize: "12px", fontWeight: 700, color: "#448C74" }}
              >
                {progressPct}%
              </span>
            </div>
            <div style={styles.progressBar(progressPct)}>
              <div style={styles.progressFill(progressPct)} />
            </div>
          </div>
        )}

        {/* ── Section Cards ── */}
        <div>
          {REGULATORY_SECTIONS.map((section, idx) => {
            const result = sectionResults[section.id];
            const isExpanded = expandedSections.has(section.id);
            const SectionIcon = section.icon;

            return (
              <div
                key={section.id}
                style={styles.sectionCard(section.color, isExpanded)}
              >
                {/* Section Header */}
                <button
                  style={styles.sectionHeader}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                    }}
                  >
                    <div style={styles.sectionIconBadge(section.gradient)}>
                      <SectionIcon />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#222",
                        }}
                      >
                        <span
                          style={{
                            color: section.color,
                            fontWeight: 700,
                            marginRight: "6px",
                            fontSize: "12px",
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {section.title}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={styles.statusBadge(result.status)}>
                      <StatusIcon status={result.status} />
                      {statusLabel(result.status)}
                    </div>
                    {isExpanded ? (
                      <FaChevronUp style={{ color: "#999", fontSize: "12px" }} />
                    ) : (
                      <FaChevronDown
                        style={{ color: "#999", fontSize: "12px" }}
                      />
                    )}
                  </div>
                </button>

                {/* Section Body (collapsible) */}
                {isExpanded && (
                  <div style={styles.answerBox}>
                    {/* Editable Question */}
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <strong style={{ color: "#448C74", fontSize: "13px" }}>Q:</strong>
                        <span style={{ fontSize: "11px", color: "#999", fontStyle: "italic" }}>Edit the query below before running analysis</span>
                      </div>
                      <textarea
                        value={editableQuestions[section.id] || ""}
                        onChange={(e) => {
                          updateQuestion(section.id, e.target.value);
                          userEditedRef.current[section.id] = true;
                        }}
                        disabled={isRunning}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #dde2e8",
                          borderLeft: "3px solid #448C74",
                          background: isRunning ? "#f5f7fa" : "#fff",
                          fontSize: "13px",
                          lineHeight: "1.6",
                          color: "#333",
                          resize: "vertical",
                          fontFamily: "inherit",
                          outline: "none",
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#448C74";
                          e.target.style.boxShadow = "0 0 0 3px rgba(68,140,116,0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#dde2e8";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                        <button
                          onClick={() => runSingleSection(section.id)}
                          disabled={result.status === "loading"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 16px",
                            borderRadius: "8px",
                            border: "none",
                            background:
                              result.status === "loading"
                                ? "#ccc"
                                : "linear-gradient(135deg, #448C74, #55d19d)",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: result.status === "loading" ? "not-allowed" : "pointer",
                            transition: "opacity 0.2s ease",
                          }}
                          onMouseEnter={(e) => { if (result.status !== "loading") e.target.style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { e.target.style.opacity = "1"; }}
                        >
                          {result.status === "loading" ? (
                            <>
                              <FaSpinner style={{ animation: "spin 1s linear infinite", fontSize: "11px" }} />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FaPlay style={{ fontSize: "10px" }} />
                              Run Query
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Answer content */}
                    {result.status === "pending" && (
                      <div
                        style={{
                          color: "#aaa",
                          fontSize: "13px",
                          fontStyle: "italic",
                        }}
                      >
                        Upload a PDF and run analysis to get the answer.
                      </div>
                    )}

                    {result.status === "loading" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          color: "#e65100",
                          fontSize: "13px",
                          padding: "12px 0",
                        }}
                      >
                        <FaSpinner
                          style={{
                            animation: "spin 1s linear infinite",
                            fontSize: "16px",
                          }}
                        />
                        Retrieving answer from document...
                      </div>
                    )}

                    {result.status === "completed" && (
                      <div className="regulatory-answer-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.answer}
                        </ReactMarkdown>
                      </div>
                    )}

                    {result.status === "error" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#c62828",
                          fontSize: "13px",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          background: "#fce4ec",
                        }}
                      >
                        <FaCircleExclamation />
                        {result.error || "Failed to retrieve answer."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .regulatory-answer-md h1,
        .regulatory-answer-md h2,
        .regulatory-answer-md h3 {
          margin-top: 12px;
          margin-bottom: 6px;
          color: #333;
        }
        .regulatory-answer-md h1 { font-size: 18px; font-weight: 700; }
        .regulatory-answer-md h2 { font-size: 16px; font-weight: 600; }
        .regulatory-answer-md h3 { font-size: 14px; font-weight: 600; }
        .regulatory-answer-md p  { margin: 6px 0; line-height: 1.7; }
        .regulatory-answer-md ul,
        .regulatory-answer-md ol {
          margin: 6px 0;
          padding-left: 20px;
        }
        .regulatory-answer-md li { margin-bottom: 4px; }
        .regulatory-answer-md table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 13px;
        }
        .regulatory-answer-md th,
        .regulatory-answer-md td {
          border: 1px solid #dde2e8;
          padding: 8px 12px;
          text-align: left;
        }
        .regulatory-answer-md th {
          background: #f0f4f8;
          font-weight: 600;
          color: #444;
        }
        .regulatory-answer-md strong { color: #222; }
        .regulatory-answer-md blockquote {
          border-left: 3px solid #448C74;
          padding-left: 12px;
          margin: 8px 0;
          color: #555;
          font-style: italic;
        }
        .regulatory-answer-md code {
          background: #f0f4f8;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          color: #c62828;
        }
      `}</style>
    </div>
  );
};

export default RegulatoryIntelligence;
