require "twitter_oauth"
require "logger"

logger = Logger.new(STDOUT)

# Hax to bypass SSL verification
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

options_twitter = {:consumer_key => ARGV[0].chomp, :consumer_secret => ARGV[1].chomp}

logger.info "Logging status: #{options_twitter.inspect}"

client = TwitterOAuth::Client.new options_twitter

logger.info "Client: #{client.inspect}"

request_token = client.authentication_request_token(
  :oauth_callback => 'oob'
)

logger.info "Request token: #{request_token.inspect}"
logger.info "Request token: #{request_token.token}"
logger.info "Request token: #{request_token.secret}"

logger.info "Go to #{request_token.authorize_url}&force_login=true"
puts "Input your pincode: "

access_token = client.authorize(
  request_token.token,
  request_token.secret,
  :oauth_verifier => $stdin.gets.chomp
)
  
options_twitter[:access_token]        = access_token.token
options_twitter[:access_token_secret] = access_token.secret
  
logger.info "Result: #{options_twitter.inspect}"

