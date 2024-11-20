from pymongo import MongoClient
import sys
from urllib.parse import quote_plus

def test_mongodb_connection(username, password, cluster_url):
    try:
        # URL encode the username and password
        username = quote_plus(username)
        password = quote_plus(password)
        
        # Construct the connection string with SCRAM-SHA-256 authentication
        connection_string = f"mongodb+srv://{username}:{password}@{cluster_url}/?authMechanism=SCRAM-SHA-256&retryWrites=true&w=majority&appName=Cluster0"
        
        print(f"Attempting to connect to MongoDB cluster: {cluster_url}")
        print(f"Username: {username}")
        
        # Create a MongoDB client with SCRAM authentication
        client = MongoClient(connection_string, 
                           serverSelectionTimeoutMS=5000)
        
        # Test the connection
        print("Testing connection...")
        client.admin.command('ismaster')
        
        print("✅ Successfully connected to MongoDB!")
        
        # List available databases
        print("\nAvailable databases:")
        for db_name in client.list_database_names():
            print(f"- {db_name}")
            
    except Exception as e:
        print("❌ Failed to connect to MongoDB")
        print(f"Error: {str(e)}")
        print("\nDetailed error information:")
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    username = "davidpthomsen"
    password = "db_25cXa9e3Uyqrfbg1"
    cluster_url = "cluster0.rz2oj.mongodb.net"
    test_mongodb_connection(username, password, cluster_url)
