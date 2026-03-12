import random

class GreenCreditScoreEngine:
    def calculate_score(self, user_id):
        # Algorithm: (Total Weight * 0.4) + (Verification Accuracy * 0.4) - (Fraud Score * 0.2)
        # Mocking values for prototype
        num_collections = random.randint(5, 50)
        total_weight = num_collections * random.uniform(0.5, 2.0)
        accuracy = random.uniform(85, 99)
        fraud_score = random.uniform(0, 5)
        
        score = (total_weight * 0.4) + (accuracy * 0.4) - (fraud_score * 0.2)
        return min(max(score, 0), 100)

    def check_loan_eligibility(self, user_id):
        score = self.calculate_score(user_id)
        if score > 70:
            return {"eligible": True, "max_loan": "500 Tokens", "interest_rate": "2%"}
        return {"eligible": False, "reason": "Score too low. Required: 70+"}

score_engine = GreenCreditScoreEngine()
