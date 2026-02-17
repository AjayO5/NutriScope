from config import supabase
import json

def inspect():
    try:
        res = supabase.table("food_items").select("*").limit(1).execute()
        if res.data:
            for key in res.data[0].keys():
                print(key)
        else:
            print("No data in food_items, cannot infer columns easily.")
            
            # Try inserting a dummy to get column error? No, that's unsafe.
            # We'll assume standard from requirements if empty, but hopefully it's not.
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
