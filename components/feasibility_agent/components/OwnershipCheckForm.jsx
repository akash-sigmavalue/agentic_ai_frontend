import { useEffect, useState } from "react";

const OwnershipCheckForm = ({ isDark = false }) => {
  const [formData, setFormData] = useState({
    ownership: "",
    premiumAmount: "",
    revenueShare: "",
    areaPercentage: "",
    commercialAreaPercentage: "",
    residentialAreaPercentage: "",
  });

  useEffect(() => {
    // Prefer explicitly saved ownership data if present
    const savedOwnership = localStorage.getItem("ownershipCheck");
    if (savedOwnership) {
      const parsed = JSON.parse(savedOwnership);
      setFormData({
        ownership: parsed.ownership || "",
        premiumAmount: parsed.premiumAmount || "",
        revenueShare: parsed.revenueShare || "",
        areaPercentage: parsed.areaPercentage || "",
        commercialAreaPercentage: parsed.commercialAreaPercentage || "",
        residentialAreaPercentage: parsed.residentialAreaPercentage || "",
      });
      return;
    }

    const saved = localStorage.getItem("landDetailsForm");
    if (saved) {
      const parsed = JSON.parse(saved);
      setFormData({
        ownership: parsed.ownership || "",
        premiumAmount: parsed.premiumAmount || "",
        revenueShare: parsed.revenueShare || "",
        areaPercentage: parsed.areaPercentage || "",
        commercialAreaPercentage: parsed.commercialAreaPercentage || "",
        residentialAreaPercentage: parsed.residentialAreaPercentage || "",
      });
    }
  }, []);

  const handleInputChange = (field, value) => {
    let nextValue = value;
    if (field === "revenueShare" || field === "areaPercentage" || field === "commercialAreaPercentage" || field === "residentialAreaPercentage") {
      const num = parseFloat(value);
      if (isNaN(num)) {
        nextValue = "";
      } else {
        if (num < 0) nextValue = 0;
        else if (num > 100) nextValue = 100;
        else nextValue = num;
      }
    }
    const newData = { ...formData, [field]: nextValue };
    setFormData(newData);

    const existing = JSON.parse(localStorage.getItem("landDetailsForm") || "{}");
    localStorage.setItem(
      "landDetailsForm",
      JSON.stringify({ ...existing, ...newData })
    );
  };

  const handleSave = () => {
    const existing = JSON.parse(localStorage.getItem("landDetailsForm") || "{}");
    const toSave = { ...existing, ...formData };
    localStorage.setItem("landDetailsForm", JSON.stringify(toSave));
    // Also save under a dedicated key for easier discovery
    localStorage.setItem("ownershipCheck", JSON.stringify(formData));
    // notify listeners that depend on land data
    window.dispatchEvent(new CustomEvent('landDetailsUpdated'));
    alert("Ownership details have been saved successfully.");
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label">Who owns the land? *</label>
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name="ownership"
            id="oc-developer"
            value="developer"
            checked={formData.ownership === "developer"}
            onChange={(e) => handleInputChange("ownership", e.target.value)}
          />
          <label className="form-check-label" htmlFor="oc-developer">
            Developer-owned
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name="ownership"
            id="oc-jda"
            value="jda"
            checked={formData.ownership === "jda"}
            onChange={(e) => handleInputChange("ownership", e.target.value)}
          />
          <label className="form-check-label" htmlFor="oc-jda">
            Landowner (Joint Development Agreement)
          </label>
        </div>
      </div>

      {formData.ownership === "jda" && (
        <div className="col-12">
          <div className={`row g-3 p-3 rounded ${isDark ? "bg-dark border border-secondary" : "bg-light"}`}>
            <div className="col-md-4">
              <label htmlFor="oc-premiumAmount" className="form-label">Premium Amount To Land Owner(Optional)</label>
              <input
                type="number"
                className={`form-control ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                id="oc-premiumAmount"
                value={formData.premiumAmount}
                onChange={(e) => handleInputChange("premiumAmount", e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="oc-revenueShare" className="form-label">Revenue Share % (Optional)</label>
              <input
                type="number"
                className={`form-control ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                id="oc-revenueShare"
                min="0"
                max="100"
                value={formData.revenueShare}
                onChange={(e) => handleInputChange("revenueShare", e.target.value)}
                placeholder="Enter percentage"
              />
            </div>

            {(() => {
              const zoningType = localStorage.getItem("zoningType")?.toLowerCase();
              if (zoningType === "mixed") {
                return (
                  <>
                    <div className="col-md-4">
                      <label htmlFor="oc-commercialAreaPercentage" className="form-label">Commercial Area % (Optional)</label>
                      <input
                        type="number"
                        className={`form-control ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                        id="oc-commercialAreaPercentage"
                        min="0"
                        max="100"
                        value={formData.commercialAreaPercentage}
                        onChange={(e) => handleInputChange("commercialAreaPercentage", e.target.value)}
                        placeholder="Enter percentage"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="oc-residentialAreaPercentage" className="form-label">Residential Area % (Optional)</label>
                      <input
                        type="number"
                        className={`form-control ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                        id="oc-residentialAreaPercentage"
                        min="0"
                        max="100"
                        value={formData.residentialAreaPercentage}
                        onChange={(e) => handleInputChange("residentialAreaPercentage", e.target.value)}
                        placeholder="Enter percentage"
                      />
                    </div>
                  </>
                );
              } else {
                return (
                  <div className="col-md-4">
                    <label htmlFor="oc-areaPercentage" className="form-label">Area Percentage (Optional)</label>
                    <input
                      type="number"
                      className={`form-control ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                      id="oc-areaPercentage"
                      min="0"
                      max="100"
                      value={formData.areaPercentage}
                      onChange={(e) => handleInputChange("areaPercentage", e.target.value)}
                      placeholder="Enter percentage"
                    />
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
      <div className="col-12 pt-3">
        <button className="btn btn-primary w-100" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
};

export default OwnershipCheckForm;


