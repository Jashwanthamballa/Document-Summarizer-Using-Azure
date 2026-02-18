"""
PromptFlow Deployed Endpoint Runner with Azure AD Authentication
Calls deployed PromptFlow REST API endpoint
"""
import os
import json
import httpx
from pathlib import Path
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PromptFlowRunner:
    def __init__(self):
        self.promptflow_endpoint = os.getenv("PROMPTFLOW_ENDPOINT")
        if not self.promptflow_endpoint:
            raise ValueError("PROMPTFLOW_ENDPOINT environment variable is required")
        self.promptflow_key = os.getenv("PROMPTFLOW_KEY", "")  # Optional if using Azure AD
        self.credential = DefaultAzureCredential()
        self.http_client = httpx.Client(verify=False)  # SSL bypass for corporate networks
    
    def _get_auth_headers(self):
        """Get authentication headers for PromptFlow API"""
        deployment_name = os.getenv("PROMPTFLOW_DEPLOYMENT")
        if not deployment_name:
            raise ValueError("PROMPTFLOW_DEPLOYMENT environment variable is required")
            
        headers = {
            "Content-Type": "application/json",
            "azureml-model-deployment": deployment_name
        }
        
        if self.promptflow_key:
            # Use API key if provided
            headers["Authorization"] = f"Bearer {self.promptflow_key}"
        else:
            # Use Azure AD token
            try:
                token = self.credential.get_token("https://ml.azure.com/.default")
                headers["Authorization"] = f"Bearer {token.token}"
            except Exception as e:
                raise
        
        return headers
    
    def run_flow(self, document_text):
        """Execute the deployed PromptFlow with the given document text"""
        try:
            # Prepare request payload - PromptFlow expects {"document-text": "..."} format
            data = {"document-text": document_text}
            body = str.encode(json.dumps(data))
            
            # Get deployment name
            deployment_name = os.getenv("PROMPTFLOW_DEPLOYMENT")
            if not deployment_name:
                raise ValueError("PROMPTFLOW_DEPLOYMENT environment variable is required")
            
            # Azure portal format headers
            headers = {
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.promptflow_key}',
                'azureml-model-deployment': deployment_name
            }
            
            # Call PromptFlow endpoint - using requests format like Azure portal
            response = self.http_client.post(
                self.promptflow_endpoint,
                content=body,  # Send raw encoded body
                headers=headers,
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Handle different response formats
                if isinstance(result, dict):
                    # If response is a dict with separate summaries
                    return {
                        "short": result.get("short", "Summary not generated"),
                        "medium": result.get("medium", "Summary not generated"), 
                        "long": result.get("long", "Summary not generated")
                    }
                else:
                    # If response is a single string, use it for all types
                    return {
                        "short": str(result)[:200] + "..." if len(str(result)) > 200 else str(result),
                        "medium": str(result),
                        "long": str(result)
                    }
            else:
                return None
                
        except Exception as e:
            return None
    
    def __del__(self):
        """Clean up HTTP client"""
        if hasattr(self, 'http_client'):
            self.http_client.close()