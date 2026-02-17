from datetime import datetime

def check_alerts(current_time: datetime, protein_intake: float, protein_goal: float, water_intake: float, water_goal: float) -> list[str]:
    """
    Check for health alerts based on daily goals and current time.
    
    Rules:
    1. If evening and protein < 60% goal -> High Protein Alert
    2. If evening and water < goal -> Hydration Warning
    """
    alerts = []
    
    # Define evening as after 18:00 (6 PM)
    # The prompt implies checking "current_time" which is passed in.
    is_evening = current_time.hour >= 18
    
    # Rule 1: Protein check
    if is_evening and protein_intake < (0.6 * protein_goal):
        alerts.append("High Protein Alert: You are below 60% of your protein goal.")
        
    # Rule 2: Water check
    # Prompt: "If water < goal -> Hydration Warning"
    # Assuming this check effectively also meaningful only towards end of day 
    # OR if the user strictly meant "current_time" is not a factor, it would alert all day.
    # Given the parallel structure with the previous rule, let's treat it as an evening check 
    # to avoid spamming the user in the morning.
    if is_evening and water_intake < water_goal:
        alerts.append("Hydration Warning: You haven't met your daily water goal.")
        
    return alerts
