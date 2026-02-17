import os
from config import supabase
import sys

# Force utf-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

def inspect_cols():
    try:
        res = supabase.table("food_items").select("*").limit(1).execute()
        if res.data:
            keys = list(res.data[0].keys())
            for k in keys:
                print(f"'{k}'")
        else:
            print("No data found")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_cols()
