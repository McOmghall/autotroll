require "twitter"
require "logger"
require "oauth"

logger = Logger.new(STDOUT)

logger.info "Crawl start"

options_twitter = { 
  :consumer_key     => "rYh1wRySn0W9WqCFex6wwHtSs",
  :consumer_secret  => "qpvCHUiLvE3VTrOJk4EA4zQbLeXSUz1hnYSi8jCLf9XfwxZ279"
}

signing_consumer = OAuth::Consumer.new(options_twitter[:consumer_key], options_twitter[:consumer_secret], :site => "https://api.twitter.com", :scheme => :header)

access_token = OAuth::AccessToken.from_hash(signing_consumer, {:oauth_token => options_twitter[:consumer_key], :oauth_token_secret => options_twitter[:consumer_secret]})
options_twitter[:access_token]        = access_token.token
options_twitter[:access_token_secret] = access_token.secret

logger.info "Logging status #{options_twitter.to_s}"

# Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
client = Twitter::REST::Client.new options_twitter 

logger.info "Client configured #{client.to_s} as #{client.user.name}"

logger.info "Writing"

client.update("Tryingstuff")

logger.info "Crawl end"

