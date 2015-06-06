require "twitter"
require "twitter_oauth"
require_relative "logger_config"
require_relative "config/oauth_data"
require_relative "integer_extensions"

# Hax to bypass SSL verification
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE


class TwitterDumpSearch
  
  DEFAULT_OPTIONS = {
      :loops => 15,
      :min_time => Date.today.prev_year.to_time,
      :starting_id => Integer::MAX
  }
  
  def initialize options_override = {}
    @logger = LoggerConfig.new
    @logger.info "Initializing crawler start, provided options: #{options_override}"
    
    @client = Twitter::REST::Client.new OAuthData.options_twitter
    @logger.info "Client configured #{@client.to_s} as #{@client.user.name}"

    @options = DEFAULT_OPTIONS.merge(options_override)
    
    @logger.info "Client options #{@options.inspect}"
  end
  
  def dump_user_tweets user
    throw Exception.new("Required argument user string, to search for: given #{user}") unless user && !user.empty?
    i = 0 
    results = []
    min_date = @options[:min_time] + 100
    max_id = @options[:starting_id]
      
    handle_twitter_errors do
      while i < @options[:loops] && min_date > @options[:min_time]
        @logger.info "Request with: #{min_date} > #{max_id}"
        results_to_add = @client.user_timeline(user, :count => 200, :max_id => max_id).collect do |tweet|
          @logger.info "Tweet: #{tweet.lang} > #{tweet.user.screen_name} > #{tweet.created_at} > #{tweet.text}"
            
          max_id = tweet.id - 1 unless tweet.id > max_id
          min_date = tweet.created_at unless tweet.created_at > min_date
            
          tweet
        end
        
        break if results_to_add.nil? || results_to_add.empty?
        
        results += results_to_add
        
        i += 1
      end
    end
    
    @logger.info "We've reached an empty stream, probably the limit of it. Crawl end"
    
    return results
  end
  
  def handle_twitter_errors &block
    begin
      yield
    rescue Twitter::Error::TooManyRequests => error
      # NOTE: Your process could go to sleep for up to 15 minutes but if you
      # retry any sooner, it will almost certainly fail with the same exception.
      @logger.warn "Twitter tyranny is throttling us. Will sleep for #{error.rate_limit.reset_in + 1} seconds"
      sleep error.rate_limit.reset_in + 1
      retry
    rescue Twitter::Error::ServiceUnavailable => error
      @logger.warn "Twitter, strangely enough, appears to be down. Will sleep for 1 minute"
      sleep 60
      retry
    end
  end
end
