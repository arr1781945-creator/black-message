from social_core.backends.github import GithubOAuth2

class GithubOAuth2HTTPS(GithubOAuth2):
    REDIRECT_STATE = False
    
    def get_redirect_uri(self, state=None):
        return 'https://black-message-production.up.railway.app/oauth/complete/github/'
