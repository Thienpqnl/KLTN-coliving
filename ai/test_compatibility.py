#!/usr/bin/env python3
"""
Test script for room-user compatibility calculation
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from services.room_user_similarity import get_detailed_compatibility

if __name__ == "__main__":
    # Test with sample user ID and room ID
    # Replace these with actual IDs from your database
    
    print("🧪 Testing Room-User Compatibility Calculation\n")
    print("=" * 60)
    
    # Get test user ID from environment or use a sample
    test_user_id = os.getenv("TEST_USER_ID", "550e8400-e29b-41d4-a716-446655440000")
    test_room_id = os.getenv("TEST_ROOM_ID", "550e8400-e29b-41d4-a716-446655440001")
    
    print(f"Testing with:")
    print(f"  User ID:  {test_user_id}")
    print(f"  Room ID:  {test_room_id}\n")
    
    try:
        result = get_detailed_compatibility(test_user_id, test_room_id)
        
        if "error" in result:
            print(f"❌ Error: {result['error']}")
        else:
            print("✓ Compatibility calculation successful!\n")
            print(f"Overall Score: {result.get('overall_score', 'N/A')}/100\n")
            
            print("Scores breakdown:")
            scores = result.get('scores', {})
            for key, value in scores.items():
                print(f"  {key}: {value}")
            
            print(f"\nReasons:")
            reasons = result.get('reasons', [])
            for i, reason in enumerate(reasons, 1):
                print(f"  {i}. {reason}")
            
            print("\n" + "=" * 60)
            print("✓ Test completed successfully!")
            
    except Exception as e:
        print(f"❌ Error during testing:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
