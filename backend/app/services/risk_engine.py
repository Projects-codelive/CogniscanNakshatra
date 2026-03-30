class RiskEngineService:
    def calculate_composite_chi(self, speech_score: float, facial_score: float) -> float:
        """
        Calculates the Cognitive Health Index (CHI) from 0-100.
        Speech and Facial scores are weighted equally (50% each).
        """
        # Composite score calculation (Weighted)
        chi = (speech_score * 0.5) + (facial_score * 0.5)
        return min(max(chi, 0), 100)

    def determine_risk_tier(self, chi: float) -> str:
        """
        Maps the CHI to clinical risk tiers.
        0-35: Low Risk (Green)
        36-65: Moderate Risk (Yellow)
        66-100: High Risk (Red)
        """
        if chi <= 35:
            return "Low Risk"
        elif chi <= 65:
            return "Moderate Risk"
        else:
            return "High Risk"

    def get_color_code(self, chi: float) -> str:
        if chi <= 35:
            return "#10b981" # Green
        elif chi <= 65:
            return "#f59e0b" # Yellow
        else:
            return "#ef4444" # Red

risk_engine = RiskEngineService()
