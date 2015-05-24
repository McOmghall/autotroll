require "twitter_oauth"
require "logger"

logger = Logger.new(STDOUT)

# Hax to bypass SSL verification
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

options_twitter = {:consumer_key => ARGV[0], :consumer_secret => ARGV[1]}

logger.info "Logging status #{options_twitter.to_s}"

client = TwitterOAuth::Client.new options_twitter

request_token = client.authentication_request_token(
  :oauth_callback => 'oob'
)


logger.info "Go to #{request_token.authorize_url}"
logger.info "Write your pincode here:"

pincode = gets.strip
access_token = client.authorize(
  request_token.token,
  request_token.secret,
  :oauth_verifier => pincode
)

options_twitter[:access_token]        = access_token.token
options_twitter[:access_token_secret] = access_token.secret

logger.info "Logging status #{options_twitter.to_s}"